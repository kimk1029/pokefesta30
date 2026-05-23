'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  type CurrencyMode,
  DEFAULT_MODE,
  DEFAULT_JPY_KRW,
  formatPrice,
  loadStoredMode,
  saveMode,
} from '@/lib/currency';

interface Ctx {
  mode: CurrencyMode;
  setMode: (m: CurrencyMode) => void;
  toggle: () => void;
  /** JPY → 현재 모드 포맷 문자열. */
  format: (jpy: number) => string;
  /** JPY→KRW 환산 비율 (1 JPY = rate KRW). */
  rate: number;
}

const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CurrencyMode>(DEFAULT_MODE);
  const [rate, setRate] = useState<number>(DEFAULT_JPY_KRW);

  // 마운트 시 localStorage 모드 복원 + 실시간 환율 fetch.
  // 페이지 로드마다 새로 fetch — 서버에서 30분 메모리 캐시.
  useEffect(() => {
    setModeState(loadStoredMode());
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/fx', { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as { data?: { jpyKrw?: number } };
        if (!alive) return;
        const v = j.data?.jpyKrw;
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          setRate(v);
        }
      } catch {
        // 폴백 환율 유지.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: CurrencyMode) => {
    setModeState(m);
    saveMode(m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'jpy' ? 'krw' : 'jpy';
      saveMode(next);
      return next;
    });
  }, []);

  const format = useCallback((jpy: number) => formatPrice(jpy, mode, rate), [mode, rate]);

  return (
    <CurrencyCtx.Provider value={{ mode, setMode, toggle, format, rate }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency(): Ctx {
  const v = useContext(CurrencyCtx);
  if (!v) {
    // Provider 밖에서도 호출될 수 있도록 폴백 — 기본 JPY 모드.
    return {
      mode: DEFAULT_MODE,
      setMode: () => undefined,
      toggle: () => undefined,
      format: (jpy: number) => formatPrice(jpy, DEFAULT_MODE, DEFAULT_JPY_KRW),
      rate: DEFAULT_JPY_KRW,
    };
  }
  return v;
}

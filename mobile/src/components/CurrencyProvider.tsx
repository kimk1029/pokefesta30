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
  DEFAULT_CURRENCY_MODE,
  DEFAULT_JPY_KRW,
  CURRENCY_STORAGE_KEY,
  formatPrice,
} from '@/lib/currency';
import { api } from '@/lib/apiClient';
import { getString, setString } from '@/lib/kvStore';

interface Ctx {
  mode: CurrencyMode;
  setMode: (m: CurrencyMode) => void;
  toggle: () => void;
  format: (jpy: number) => string;
  rate: number;
}

const CurrencyCtx = createContext<Ctx | null>(null);

/** 통화 컨텍스트 — 마운트 시 /api/fx fetch + kvStore 에서 저장된 모드 복원. */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CurrencyMode>(DEFAULT_CURRENCY_MODE);
  const [rate, setRate] = useState<number>(DEFAULT_JPY_KRW);

  useEffect(() => {
    // 저장된 모드 복원
    const stored = getString(CURRENCY_STORAGE_KEY);
    if (stored === 'jpy' || stored === 'krw') setModeState(stored);

    // 실시간 환율 fetch (실패 시 폴백 유지)
    let alive = true;
    (async () => {
      try {
        const r = await api<{ data?: { jpyKrw?: number } }>('/api/fx', { auth: false });
        if (!alive) return;
        const v = r?.data?.jpyKrw;
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) setRate(v);
      } catch {
        // 폴백 환율 유지
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: CurrencyMode) => {
    setModeState(m);
    setString(CURRENCY_STORAGE_KEY, m);
  }, []);
  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'jpy' ? 'krw' : 'jpy';
      setString(CURRENCY_STORAGE_KEY, next);
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
    return {
      mode: DEFAULT_CURRENCY_MODE,
      setMode: () => undefined,
      toggle: () => undefined,
      format: (jpy: number) => formatPrice(jpy, DEFAULT_CURRENCY_MODE, DEFAULT_JPY_KRW),
      rate: DEFAULT_JPY_KRW,
    };
  }
  return v;
}

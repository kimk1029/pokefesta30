'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * 가격 모드 — 'single' (raw, non-PSA10) 또는 'psa10'.
 * 모바일의 `mobile/src/lib/priceMode.tsx` 와 동일 컨셉.
 *
 * 상세 페이지 우측 상단 토글이 모드를 바꾸면, 컬렉션 리스트와 포트폴리오
 * 합계도 동일 모드로 가격 표시.
 */
export type PriceMode = 'single' | 'psa10';

const STORAGE_KEY = 'pf30:priceMode';
const DEFAULT_MODE: PriceMode = 'single';

interface Ctx {
  mode: PriceMode;
  setMode: (m: PriceMode) => void;
  toggle: () => void;
}

const PriceModeCtx = createContext<Ctx | null>(null);

function loadStored(): PriceMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'psa10' || v === 'single' ? v : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function save(mode: PriceMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore quota
  }
}

export function PriceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PriceMode>(DEFAULT_MODE);

  useEffect(() => {
    setModeState(loadStored());
  }, []);

  const setMode = useCallback((m: PriceMode) => {
    setModeState(m);
    save(m);
  }, []);
  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: PriceMode = prev === 'single' ? 'psa10' : 'single';
      save(next);
      return next;
    });
  }, []);

  return (
    <PriceModeCtx.Provider value={{ mode, setMode, toggle }}>
      {children}
    </PriceModeCtx.Provider>
  );
}

export function usePriceMode(): Ctx {
  return useContext(PriceModeCtx) ?? { mode: DEFAULT_MODE, setMode: () => undefined, toggle: () => undefined };
}

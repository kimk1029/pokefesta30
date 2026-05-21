import { createContext, useContext, useState, type ReactNode } from 'react';

export type PriceMode = 'single' | 'psa10';

interface Ctx {
  mode: PriceMode;
  setMode: (m: PriceMode) => void;
  toggle: () => void;
}

const PriceModeContext = createContext<Ctx>({
  mode: 'single',
  setMode: () => {},
  toggle: () => {},
});

/** Global price-mode provider. Defaults to 'single' (raw / un-graded);
 *  toggling switches the displayed prices and portfolio totals to the
 *  PSA-10 segment. Lives in app/_layout.tsx so every screen shares state. */
export function PriceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PriceMode>('single');
  return (
    <PriceModeContext.Provider
      value={{
        mode,
        setMode,
        toggle: () => setMode((m) => (m === 'single' ? 'psa10' : 'single')),
      }}
    >
      {children}
    </PriceModeContext.Provider>
  );
}

export function usePriceMode(): Ctx {
  return useContext(PriceModeContext);
}

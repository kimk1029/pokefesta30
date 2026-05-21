import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ChromeApi {
  hidden: boolean;
  setHidden: (v: boolean) => void;
}

const ChromeCtx = createContext<ChromeApi>({ hidden: false, setHidden: () => {} });

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [hidden, setHiddenState] = useState(false);
  const setHidden = useCallback((v: boolean) => setHiddenState(v), []);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);
  return <ChromeCtx.Provider value={value}>{children}</ChromeCtx.Provider>;
}

export function useChrome() {
  return useContext(ChromeCtx);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
} from '@/lib/theme';
import { getString, setString } from '@/lib/kvStore';

interface Ctx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = getString(THEME_STORAGE_KEY);
    if (isThemeId(stored)) setThemeState(stored);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    setString(THEME_STORAGE_KEY, t);
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  return useContext(ThemeCtx) ?? { theme: DEFAULT_THEME, setTheme: () => undefined };
}

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
import { colors } from '@/theme/tokens';

interface Ctx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

export const THEME_COLORS: Record<ThemeId, typeof colors> = {
  pokemon: colors,
  onepiece: {
    ...colors,
    red: '#D92332',
    redLt: '#FF6B6B',
    redDk: '#8F1620',
    yel: '#F4D272',
    yelLt: '#FCE6A8',
    yelDk: '#B8884B',
    gold: '#E5B85A',
    goldLt: '#F4D272',
    goldDk: '#7A5A2A',
    blu: '#1B6FB8',
    bluLt: '#4BA0E0',
    bluDk: '#0B3F70',
    grn: '#2FBF8F',
    grnLt: '#78E2BD',
    grnDk: '#0D6B55',
    orn: '#F4783D',
    ornLt: '#FFA070',
    ornDk: '#9B3B0A',
    bg: '#FBF1D9',
    paper: '#FBF1D9',
    pap2: '#F0DEAA',
    pap3: '#CDB57B',
    papdk: '#7E6A38',
    white: '#FFF8E5',
  },
  yugioh: {
    ...colors,
    red: '#7C3AED',
    redLt: '#A78BFA',
    redDk: '#4C1D95',
    blu: '#4C1D95',
    bluLt: '#7C3AED',
    bluDk: '#2E1065',
    ink: '#241437',
    ink2: '#3B0764',
    ink3: '#6B21A8',
    paper: '#F4E8FF',
    bg: '#F4E8FF',
    pap2: '#E9D5FF',
    pap3: '#C4B5FD',
    papdk: '#6D28D9',
    white: '#FFF7D6',
    gold: '#FFD23F',
    goldLt: '#FCE6A8',
    goldDk: '#B8860B',
    yel: '#FFD23F',
    yelLt: '#FCE6A8',
    yelDk: '#B8860B',
  },
  sports: {
    ...colors,
    red: '#DC2626',
    redLt: '#F87171',
    redDk: '#7F1D1D',
    yel: '#FACC15',
    yelLt: '#FEF08A',
    yelDk: '#A16207',
    gold: '#FACC15',
    goldLt: '#FEF08A',
    goldDk: '#A16207',
    blu: '#2563EB',
    bluLt: '#60A5FA',
    bluDk: '#1E3A8A',
    grn: '#16A34A',
    grnLt: '#86EFAC',
    grnDk: '#14532D',
    orn: '#F97316',
    ornLt: '#FDBA74',
    ornDk: '#9A3412',
    ink: '#111827',
    ink2: '#1F2937',
    ink3: '#4B5563',
    paper: '#F7F8EA',
    bg: '#F7F8EA',
    pap2: '#DDE7C7',
    pap3: '#B7C99A',
    papdk: '#647D3A',
  },
};

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

export function useThemeColors() {
  const { theme } = useTheme();
  return THEME_COLORS[theme] ?? colors;
}

export function useThemeTextVariant(): 'pixel' | 'ko' {
  const { theme } = useTheme();
  return theme === 'sports' ? 'ko' : 'pixel';
}

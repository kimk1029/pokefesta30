import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_NAV_STYLE, loadNavStyle, saveNavStyle, type NavStyle } from '@/lib/navPrefs';

interface Ctx {
  /** 하단 탭바 스타일 — 'integrated'(통합형, 기본) | 'floating'(분리형). */
  navStyle: NavStyle;
  setNavStyle: (s: NavStyle) => void;
  toggleNavStyle: () => void;
}

const NavPrefsCtx = createContext<Ctx | null>(null);

export function NavPrefsProvider({ children }: { children: ReactNode }) {
  // kvStore 는 동기 — 렌더 시점에 바로 복원해 깜빡임 없이 초기값 설정.
  const [navStyle, setState] = useState<NavStyle>(() => loadNavStyle());

  const setNavStyle = useCallback((s: NavStyle) => {
    setState(s);
    saveNavStyle(s);
  }, []);

  const toggleNavStyle = useCallback(() => {
    setState((prev) => {
      const next: NavStyle = prev === 'floating' ? 'integrated' : 'floating';
      saveNavStyle(next);
      return next;
    });
  }, []);

  return (
    <NavPrefsCtx.Provider value={{ navStyle, setNavStyle, toggleNavStyle }}>
      {children}
    </NavPrefsCtx.Provider>
  );
}

export function useNavPrefs(): Ctx {
  const v = useContext(NavPrefsCtx);
  if (!v) {
    return { navStyle: DEFAULT_NAV_STYLE, setNavStyle: () => undefined, toggleNavStyle: () => undefined };
  }
  return v;
}

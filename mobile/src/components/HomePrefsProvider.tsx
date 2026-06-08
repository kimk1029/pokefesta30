import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SHOW_PORTFOLIO_ON_MAIN,
  loadShowPortfolioOnMain,
  saveShowPortfolioOnMain,
} from '@/lib/homePrefs';

interface Ctx {
  /** 메인에 포트폴리오 hero 표시 여부 (기본 false). */
  showPortfolioOnMain: boolean;
  setShowPortfolioOnMain: (on: boolean) => void;
  toggleShowPortfolioOnMain: () => void;
}

const HomePrefsCtx = createContext<Ctx | null>(null);

export function HomePrefsProvider({ children }: { children: ReactNode }) {
  // kvStore 는 동기 — 렌더 시점에 바로 복원해 깜빡임 없이 초기값 설정.
  const [showPortfolioOnMain, setState] = useState<boolean>(() => loadShowPortfolioOnMain());

  const setShowPortfolioOnMain = useCallback((on: boolean) => {
    setState(on);
    saveShowPortfolioOnMain(on);
  }, []);

  const toggleShowPortfolioOnMain = useCallback(() => {
    setState((prev) => {
      const next = !prev;
      saveShowPortfolioOnMain(next);
      return next;
    });
  }, []);

  return (
    <HomePrefsCtx.Provider
      value={{ showPortfolioOnMain, setShowPortfolioOnMain, toggleShowPortfolioOnMain }}
    >
      {children}
    </HomePrefsCtx.Provider>
  );
}

export function useHomePrefs(): Ctx {
  const v = useContext(HomePrefsCtx);
  if (!v) {
    return {
      showPortfolioOnMain: DEFAULT_SHOW_PORTFOLIO_ON_MAIN,
      setShowPortfolioOnMain: () => undefined,
      toggleShowPortfolioOnMain: () => undefined,
    };
  }
  return v;
}

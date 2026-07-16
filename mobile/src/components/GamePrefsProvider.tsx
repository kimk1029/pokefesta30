import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_ENABLED_GAMES,
  GAME_IDS,
  loadEnabledGames,
  saveEnabledGames,
  type GameId,
} from '@/lib/gamePrefs';

interface Ctx {
  /** 켜져 있는 게임 목록 (GAME_IDS 순서, 항상 1개 이상). */
  enabledGames: GameId[];
  isGameEnabled: (game: GameId) => boolean;
  /** 게임 on/off 토글. 마지막 남은 1개를 끄려 하면 무시된다. */
  toggleGame: (game: GameId) => void;
}

const GamePrefsCtx = createContext<Ctx | null>(null);

export function GamePrefsProvider({ children }: { children: ReactNode }) {
  // kvStore 는 동기 — 렌더 시점에 바로 복원해 깜빡임 없이 초기값 설정.
  const [enabledGames, setState] = useState<GameId[]>(() => loadEnabledGames());

  const toggleGame = useCallback((game: GameId) => {
    setState((prev) => {
      const on = prev.includes(game);
      if (on && prev.length <= 1) return prev; // 최소 1개는 유지
      const next = on
        ? prev.filter((g) => g !== game)
        : GAME_IDS.filter((g) => g === game || prev.includes(g));
      saveEnabledGames(next);
      return next;
    });
  }, []);

  const isGameEnabled = useCallback(
    (game: GameId) => enabledGames.includes(game),
    [enabledGames],
  );

  return (
    <GamePrefsCtx.Provider value={{ enabledGames, isGameEnabled, toggleGame }}>
      {children}
    </GamePrefsCtx.Provider>
  );
}

export function useGamePrefs(): Ctx {
  const v = useContext(GamePrefsCtx);
  if (!v) {
    return {
      enabledGames: DEFAULT_ENABLED_GAMES,
      isGameEnabled: () => true,
      toggleGame: () => undefined,
    };
  }
  return v;
}

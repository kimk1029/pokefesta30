export type ThemeId = 'pokemon' | 'onepiece' | 'yugioh';

export const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  desc: string;
}> = [
  {
    id: 'pokemon',
    label: '포켓몬',
    desc: '몬스터볼 + 빨강·노랑 (기본)',
  },
  {
    id: 'onepiece',
    label: '원피스',
    desc: '루피의 밀짚모자 + 노을 톤',
  },
  {
    id: 'yugioh',
    label: '유희왕',
    desc: '천년 퍼즐 + 보라·황금 톤',
  },
] as const;

export const DEFAULT_THEME: ThemeId = 'pokemon';
export const THEME_STORAGE_KEY = 'pokefesta-theme';

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'pokemon' || v === 'onepiece' || v === 'yugioh';
}

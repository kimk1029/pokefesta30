export type ThemeId = 'pokemon' | 'onepiece' | 'yugioh' | 'sports' | 'clean';

export const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  desc: string;
}> = [
  {
    id: 'pokemon',
    label: '포켓몬스터',
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
  {
    id: 'sports',
    label: '스포츠',
    desc: '스코어보드 + 잔디·스타디움 톤',
  },
  {
    id: 'clean',
    label: '클린',
    desc: '비트 아닌 깔끔·라운드 (모던)',
  },
] as const;

export const DEFAULT_THEME: ThemeId = 'pokemon';
export const THEME_STORAGE_KEY = 'pokefesta-theme';

export function isThemeId(v: unknown): v is ThemeId {
  return (
    v === 'pokemon' ||
    v === 'onepiece' ||
    v === 'yugioh' ||
    v === 'sports' ||
    v === 'clean'
  );
}

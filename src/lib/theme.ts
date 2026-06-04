export type ThemeId = 'pokemon' | 'onepiece' | 'yugioh' | 'sports' | 'clean' | 'dark';

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
  {
    id: 'dark',
    label: '다크',
    desc: '네온 글로우 다크 모드 (모던)',
  },
] as const;

export const DEFAULT_THEME: ThemeId = 'pokemon';
export const THEME_STORAGE_KEY = 'pokefesta-theme';

/**
 * "플랫(논픽셀)" 테마 여부 — clean·dark 는 픽셀 프레임/아이콘 대신
 * 라운드+소프트(모던) 외형을 쓴다. 인라인 스타일 분기에서 이 헬퍼로 판정.
 */
export function isFlatTheme(t: ThemeId): boolean {
  return t === 'clean' || t === 'dark';
}

export function isThemeId(v: unknown): v is ThemeId {
  return (
    v === 'pokemon' ||
    v === 'onepiece' ||
    v === 'yugioh' ||
    v === 'sports' ||
    v === 'clean' ||
    v === 'dark'
  );
}

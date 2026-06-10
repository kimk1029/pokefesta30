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
    desc: '천년 퍼즐 + 황금 클래식 (세리프)',
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
 * "플랫(논픽셀)" 테마 여부 — clean·dark 는 라운드+소프트(모던),
 * yugioh 는 세리프+골드 프레임(클래식)으로, 셋 다 픽셀 프레임/아이콘을 쓰지 않는다.
 * 인라인 스타일 분기에서 이 헬퍼로 판정.
 */
export function isFlatTheme(t: ThemeId): boolean {
  return t === 'clean' || t === 'dark' || t === 'yugioh';
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

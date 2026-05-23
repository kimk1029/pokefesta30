/**
 * 테마 ID — 웹과 동일하게 3종.
 * 모바일에선 token override 시스템이 따로 없어, 현재 ThemeProvider 가 ID 만
 * 관리하고 일부 컴포넌트(Tabbar FAB 등)가 ID 에 따라 다른 SVG/색을 렌더한다.
 */
export type ThemeId = 'pokemon' | 'onepiece' | 'yugioh';

export const THEMES: ReadonlyArray<{ id: ThemeId; label: string; desc: string }> = [
  { id: 'pokemon',  label: '포켓몬',  desc: '몬스터볼 + 빨강·노랑 (기본)' },
  { id: 'onepiece', label: '원피스',  desc: '루피의 밀짚모자 + 노을 톤' },
  { id: 'yugioh',   label: '유희왕',  desc: '천년 퍼즐 + 보라·황금 톤' },
];

export const DEFAULT_THEME: ThemeId = 'pokemon';
export const THEME_STORAGE_KEY = 'pokefesta-theme';

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'pokemon' || v === 'onepiece' || v === 'yugioh';
}

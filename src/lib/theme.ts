export type ThemeId = 'pokemon' | 'default' | 'minimal';

export const THEMES: ReadonlyArray<{
  id: ThemeId;
  label: string;
  desc: string;
}> = [
  {
    id: 'pokemon',
    label: '포켓몬',
    desc: '몬스터볼 + 잉어킹 도트',
  },
  {
    id: 'default',
    label: '디폴트',
    desc: '심플 픽셀 (포켓몬 X)',
  },
  {
    id: 'minimal',
    label: '미니멀',
    desc: '틸 액센트 변형',
  },
] as const;

export const DEFAULT_THEME: ThemeId = 'pokemon';
export const THEME_STORAGE_KEY = 'pokefesta-theme';

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'pokemon' || v === 'default' || v === 'minimal';
}

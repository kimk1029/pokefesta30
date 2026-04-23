/** 꾸미기 샵 — 배경 · 테두리. (아바타 구매는 avatars.ts 가 담당) */

export type BackgroundId =
  | 'default'
  | 'grass'
  | 'sea'
  | 'mountain'
  | 'forest'
  | 'sunset'
  | 'city'
  | 'space'
  | 'volcano'
  | 'cave';

export interface BackgroundMeta {
  id: BackgroundId;
  name: string;
  price: number; // 0 = free
  preview: string; // emoji hint in shop card
  tag?: 'hot' | 'new' | 'legend';
}

export const BACKGROUNDS: BackgroundMeta[] = [
  { id: 'default',  name: '기본',      price: 0,   preview: '⚪' },
  { id: 'grass',    name: '풀밭',      price: 150, preview: '🌿' },
  { id: 'sea',      name: '바다',      price: 200, preview: '🌊' },
  { id: 'mountain', name: '산',        price: 250, preview: '🏔', tag: 'hot' },
  { id: 'forest',   name: '숲',        price: 300, preview: '🌲' },
  { id: 'sunset',   name: '노을',      price: 400, preview: '🌅' },
  { id: 'city',     name: '도시 야경', price: 500, preview: '🌃', tag: 'new' },
  { id: 'cave',     name: '동굴',      price: 500, preview: '🕳' },
  { id: 'volcano',  name: '화산',      price: 800, preview: '🌋' },
  { id: 'space',    name: '우주',      price: 1200, preview: '🌌', tag: 'legend' },
];

export type FrameId =
  | 'none'
  | 'simple'
  | 'gold'
  | 'ice'
  | 'fire'
  | 'leaf'
  | 'rainbow';

export interface FrameMeta {
  id: FrameId;
  name: string;
  price: number;
  preview: string;
  tag?: 'hot' | 'new' | 'legend';
}

export const FRAMES: FrameMeta[] = [
  { id: 'none',    name: '없음',      price: 0,   preview: '—' },
  { id: 'simple',  name: '픽셀 테두리', price: 100, preview: '◼' },
  { id: 'gold',    name: '황금 테두리', price: 500, preview: '🥇', tag: 'hot' },
  { id: 'leaf',    name: '나뭇잎 테두리', price: 400, preview: '🌿' },
  { id: 'ice',     name: '얼음 테두리', price: 700, preview: '❄' },
  { id: 'fire',    name: '불꽃 테두리', price: 800, preview: '🔥' },
  { id: 'rainbow', name: '무지개 테두리', price: 1500, preview: '🌈', tag: 'legend' },
];

export const DEFAULT_BG: BackgroundId = 'default';
export const DEFAULT_FRAME: FrameId = 'none';

const BG_IDS = new Set<string>(BACKGROUNDS.map((b) => b.id));
const FRAME_IDS = new Set<string>(FRAMES.map((f) => f.id));

export function isBackgroundId(v: unknown): v is BackgroundId {
  return typeof v === 'string' && BG_IDS.has(v);
}
export function isFrameId(v: unknown): v is FrameId {
  return typeof v === 'string' && FRAME_IDS.has(v);
}

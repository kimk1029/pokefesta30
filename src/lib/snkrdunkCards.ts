/**
 * 시세 페이지에 노출할 SNKRDUNK 상품 시드.
 * apparelId 는 https://snkrdunk.com/apparels/{id} 의 숫자.
 */

export interface SnkrdunkCardSeed {
  apparelId: number;
  /** 한국어 짧은 표시명 — 카드명이 길어 UI 폭에 맞춰 줄여둠. */
  shortName: string;
  /** 분류 라벨. */
  category: '박스' | '프로모' | 'SR' | '원피스';
}

export const SNKRDUNK_FEATURED_CARDS: SnkrdunkCardSeed[] = [
  { apparelId: 111467, shortName: '트리플렛비트 BOX', category: '박스' },
  { apparelId: 101885, shortName: 'VSTAR 유니버스 BOX', category: '박스' },
  { apparelId: 100090, shortName: '피카츄 뭉크展 프로모', category: '프로모' },
  { apparelId: 106796, shortName: 'Nagaba × 피카츄 프로모', category: '프로모' },
  { apparelId: 104636, shortName: '게코우가 & 조로아크 GX SR', category: 'SR' },
  { apparelId: 108050, shortName: '루피 P-033 (점프 부록)', category: '원피스' },
];

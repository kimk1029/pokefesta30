/**
 * 카드 팩 카탈로그 — 웹 [[src/lib/cardPacks.ts]] 와 1:1.
 * 모바일은 힛카드를 /api/card-packs API 로 가져오지만, 라우팅·홈 placeholder
 * 렌더링에 메타데이터가 필요해서 데이터만 미러링.
 */

export interface CardPackMeta {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
}

export const CARD_PACKS: CardPackMeta[] = [
  { code: 'sv9a', name: '메가브레이브',          shortName: '메가브레이브',     emoji: '⚔️',  bg: '#E63946', releasedAt: '2026-03-14' },
  { code: 'sv9',  name: '배틀 파트너즈',         shortName: '배틀 파트너즈',    emoji: '🤝',  bg: '#3A5BD9', releasedAt: '2026-01-24' },
  { code: 'sv8a', name: '테라스타르 페스티벌 ex', shortName: '테라스타르 ex',    emoji: '✨',  bg: '#7C3AED', releasedAt: '2025-01-24' },
  { code: 'sv8',  name: '슈퍼일렉트릭 브레이커', shortName: '일렉트릭 브레이커', emoji: '⚡',  bg: '#FFD23F', releasedAt: '2024-10-18' },
  { code: 'sv7a', name: '낙원 드라고나',         shortName: '낙원 드라고나',    emoji: '🐉',  bg: '#22C55E', releasedAt: '2024-09-13' },
  { code: 'sv7',  name: '스텔라 미라클',         shortName: '스텔라 미라클',    emoji: '🌌',  bg: '#0D9488', releasedAt: '2024-07-19' },
  { code: 'sv6a', name: '나이트 원더러',         shortName: '나이트 원더러',    emoji: '🌙',  bg: '#1B2E89', releasedAt: '2024-06-07' },
  { code: 'sv5a', name: '크림슨 헤이즈',         shortName: '크림슨 헤이즈',    emoji: '🔥',  bg: '#F97316', releasedAt: '2024-03-22' },
];

export function getCardPack(code: string): CardPackMeta | undefined {
  return CARD_PACKS.find((p) => p.code === code);
}

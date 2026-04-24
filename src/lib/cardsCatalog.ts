/**
 * 카드 시세 대상 카탈로그.
 * - id   : 앱 내부 식별자 (URL / 캐시 키)
 * - ebayQuery : eBay Browse API 검색어 — 튜닝 포인트
 * - grade : 앱 UI 분류용 (S/A/B/C)
 *
 * 앱 내 가상 아이템(예: '푸시 알림권') 은 실시세가 없으므로 카탈로그에서 제외하고
 * 실제 시장에 존재하는 포켓몬 카드/굿즈 쿼리로만 구성.
 */
import { translate } from './cardTranslate';

export type CardGrade = 'S' | 'A' | 'B' | 'C';

export interface CardCatalogEntry {
  id: string;
  name: string;
  emoji: string;
  grade: CardGrade;
  /** eBay Browse API 검색어 (영문 권장) */
  ebayQuery: string;
  /** SNKRDUNK 검색에 사용할 override. 미설정 시 name 을 ko→ja 사전으로 번역해 사용. */
  snkrdunkQuery?: string;
}

export const CARDS_CATALOG: CardCatalogEntry[] = [
  { id: 'magikarp-holo',  name: '잉어킹 홀로',          emoji: '🖼', grade: 'S', ebayQuery: 'magikarp holo pokemon card' },
  { id: 'charizard-base', name: '리자몽 베이스셋',      emoji: '🔥', grade: 'S', ebayQuery: 'charizard base set holo' },
  { id: 'pikachu-promo',  name: '피카츄 프로모',        emoji: '⚡', grade: 'A', ebayQuery: 'pikachu promo pokemon card' },
  { id: 'rainbow-rare',   name: '레인보우 레어',        emoji: '🌈', grade: 'A', ebayQuery: 'pokemon rainbow rare' },
  { id: 'eevee-dev',      name: '이브이 진화형',        emoji: '🦊', grade: 'B', ebayQuery: 'eevee evolutions pokemon card' },
  { id: 'gold-secret',    name: '골드 시크릿',          emoji: '🥇', grade: 'B', ebayQuery: 'pokemon gold secret rare' },
  { id: 'mewtwo-v',       name: '뮤츠 V',               emoji: '🧬', grade: 'A', ebayQuery: 'mewtwo v pokemon card' },
  { id: 'sticker-pack',   name: '포켓몬 스티커',        emoji: '🌟', grade: 'C', ebayQuery: 'pokemon sticker pack sealed' },
];

/**
 * SNKRDUNK 검색 딥링크.
 * query 는 보통 일본어. 카드 엔트리 기준으로 조립할 땐 `snkrdunkQueryFor(entry)` 사용.
 */
export function snkrdunkUrl(query: string): string {
  return `https://snkrdunk.com/search?keyword=${encodeURIComponent(query)}`;
}

export function snkrdunkQueryFor(entry: CardCatalogEntry): string {
  return entry.snkrdunkQuery ?? translate(entry.name, 'ja');
}

export function findCardEntry(id: string): CardCatalogEntry | undefined {
  return CARDS_CATALOG.find((c) => c.id === id);
}

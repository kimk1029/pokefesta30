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
  /** OCR 매칭용 — 카드 영문/한글/일문 이름 키워드 (소문자 비교). */
  matchNames?: string[];
  /** OCR 매칭용 — 공식 세트 코드 (예: 'SV1', 'SV-P'). 대문자 비교. */
  setCode?: string;
  /** OCR 매칭용 — 카드 번호의 좌측 (예: '045'). */
  cardNumber?: string;
}

export const CARDS_CATALOG: CardCatalogEntry[] = [
  {
    id: 'magikarp-holo',
    name: '잉어킹 홀로',
    emoji: '🖼',
    grade: 'S',
    ebayQuery: 'magikarp holo pokemon card',
    matchNames: ['magikarp', '잉어킹', 'コイキング'],
  },
  {
    id: 'charizard-base',
    name: '리자몽 베이스셋',
    emoji: '🔥',
    grade: 'S',
    ebayQuery: 'charizard base set holo',
    matchNames: ['charizard', '리자몽', 'リザードン'],
    cardNumber: '004',
  },
  {
    id: 'pikachu-promo',
    name: '피카츄 프로모',
    emoji: '⚡',
    grade: 'A',
    ebayQuery: 'pikachu promo pokemon card',
    matchNames: ['pikachu', '피카츄', 'ピカチュウ'],
    setCode: 'SV-P',
  },
  {
    id: 'rainbow-rare',
    name: '레인보우 레어',
    emoji: '🌈',
    grade: 'A',
    ebayQuery: 'pokemon rainbow rare',
    matchNames: ['rainbow rare'],
  },
  {
    id: 'eevee-dev',
    name: '이브이 진화형',
    emoji: '🦊',
    grade: 'B',
    ebayQuery: 'eevee evolutions pokemon card',
    matchNames: ['eevee', '이브이', 'イーブイ'],
  },
  {
    id: 'gold-secret',
    name: '골드 시크릿',
    emoji: '🥇',
    grade: 'B',
    ebayQuery: 'pokemon gold secret rare',
    matchNames: ['gold secret', 'gold rare'],
  },
  {
    id: 'mewtwo-v',
    name: '뮤츠 V',
    emoji: '🧬',
    grade: 'A',
    ebayQuery: 'mewtwo v pokemon card',
    matchNames: ['mewtwo', '뮤츠', 'ミュウツー'],
  },
  {
    id: 'sticker-pack',
    name: '포켓몬 스티커',
    emoji: '🌟',
    grade: 'C',
    ebayQuery: 'pokemon sticker pack sealed',
    matchNames: ['sticker'],
  },
];

/**
 * SNKRDUNK 검색 딥링크.
 * query 는 보통 일본어. 엔트리 기준 조립은 `snkrdunkQueryFor(entry)` 사용.
 * ⚠ 파라미터명은 `keyword` 가 아니라 `keywords` (복수형) 임 — 단수로 보내면 메인으로 리다이렉트됨.
 */
export function snkrdunkUrl(query: string): string {
  return `https://snkrdunk.com/search?keywords=${encodeURIComponent(query)}`;
}

export function snkrdunkQueryFor(entry: CardCatalogEntry): string {
  return entry.snkrdunkQuery ?? translate(entry.name, 'ja');
}

export function findCardEntry(id: string): CardCatalogEntry | undefined {
  return CARDS_CATALOG.find((c) => c.id === id);
}

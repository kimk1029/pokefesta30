export type Rarity = 'C' | 'U' | 'R' | 'SR' | 'HR' | 'S';
export type Game = '포켓몬' | '유희왕' | '원피스' | 'MTG' | '스포츠' | '기타';

export interface CardItem {
  id: number;
  name: string;
  set: string;
  num: string;
  game: Game;
  rar: Rarity;
  grade: number | null;
  price: number;
  trend: number[];
  emoji: string;
  owned: boolean;
  /** Card art URL — TCGdex high-res when available, else the user's own
   *  scan capture. Optional so existing seed cards still work emoji-only. */
  imageUrl?: string;
}

export interface MarketItem {
  id: number;
  cardId: number;
  type: 'sell' | 'buy' | 'trade';
  price: number | null;
  condition: string;
  seller: string;
  time: string;
}

export interface PostItem {
  id: number;
  user: string;
  avatar: string;
  time: string;
  text: string;
  hasCard: boolean;
  card: CardItem | null;
  likes: number;
  comments: number;
  type: 'showcase' | 'grade-req' | 'chat';
}

export const CARDS: CardItem[] = [
  { id: 1, name: '리자몽 EX', set: '스칼렛&바이올렛 ex', num: '006/165', game: '포켓몬', rar: 'SR', grade: 9, price: 128000, trend: [80, 90, 100, 110, 115, 120, 128], emoji: '🔥', owned: true },
  { id: 2, name: '피카츄 VMAX', set: '비비드볼트', num: '044/185', game: '포켓몬', rar: 'HR', grade: null, price: 85000, trend: [60, 65, 70, 75, 80, 82, 85], emoji: '⚡', owned: true },
  { id: 3, name: '블랙 로터스 재판', set: '언리미티드', num: '-', game: 'MTG', rar: 'S', grade: 8, price: 450000, trend: [400, 410, 420, 435, 440, 448, 450], emoji: '🌹', owned: true },
  { id: 4, name: '우루스 (오리엔트)', set: '옵션:오리엔트', num: 'SP24', game: '원피스', rar: 'SR', grade: null, price: 32000, trend: [25, 26, 28, 30, 31, 31, 32], emoji: '🌊', owned: true },
  { id: 5, name: '카이바 슈라이', set: '레거시 오브 더 발률', num: 'LOB-003', game: '유희왕', rar: 'R', grade: 10, price: 220000, trend: [180, 190, 200, 205, 210, 215, 220], emoji: '🐉', owned: true },
  { id: 6, name: '손오공 UR', set: '도천통행 제2탄', num: 'OP04-001', game: '원피스', rar: 'HR', grade: null, price: 18000, trend: [12, 13, 15, 16, 17, 17, 18], emoji: '🥊', owned: false },
  { id: 7, name: '류세이드래곤', set: '더 로스트 밀레니엄', num: 'TLM-KR040', game: '유희왕', rar: 'SR', grade: null, price: 41000, trend: [35, 36, 38, 39, 40, 40, 41], emoji: '💫', owned: true },
  { id: 8, name: '사이클론 (LOB)', set: '레거시 오브 더 발률', num: 'LOB-048', game: '유희왕', rar: 'SR', grade: 9, price: 76000, trend: [60, 62, 65, 70, 73, 75, 76], emoji: '🌪', owned: true },
];

export const MARKET: MarketItem[] = [
  { id: 101, cardId: 1, type: 'sell', price: 128000, condition: 'PSA 9', seller: 'CardMaster_KR', time: '10분 전' },
  { id: 102, cardId: 2, type: 'sell', price: 82000, condition: 'NM', seller: '피카매니아', time: '25분 전' },
  { id: 103, cardId: 5, type: 'buy', price: 200000, condition: 'PSA 9+', seller: '용사컬렉터', time: '1시간 전' },
  { id: 104, cardId: 3, type: 'sell', price: 445000, condition: 'PSA 8', seller: 'BlackLotus', time: '3시간 전' },
  { id: 105, cardId: 4, type: 'trade', price: null, condition: 'NM', seller: '원피스매니아', time: '5시간 전' },
  { id: 106, cardId: 7, type: 'sell', price: 39000, condition: 'LP', seller: '결투사', time: '1일 전' },
];

export const POSTS: PostItem[] = [
  { id: 201, user: 'CardMaster_KR', avatar: '🐉', time: '방금 전', text: '드디어 리자몽 EX PSA 9 받았다!! 3개월 기다린 보람이 있네', hasCard: true, card: CARDS[0], likes: 24, comments: 8, type: 'showcase' },
  { id: 202, user: '피카매니아', avatar: '⚡', time: '15분 전', text: '이 피카츄 VMAX 상태 어떻게 보시나요? 제출 전에 감정 부탁드립니다', hasCard: true, card: CARDS[1], likes: 12, comments: 15, type: 'grade-req' },
  { id: 203, user: 'BlackLotus', avatar: '🌹', time: '2시간 전', text: 'MTG 블랙로터스 수집하시는 분들 연락 주세요! 같이 정보 공유해요', hasCard: false, card: null, likes: 7, comments: 3, type: 'chat' },
  { id: 204, user: '용사컬렉터', avatar: '🌟', time: '5시간 전', text: 'PSA 10 카이바 슈라이! 전 세계 팝 6개 중 1개 입니다', hasCard: true, card: CARDS[4], likes: 56, comments: 22, type: 'showcase' },
];

export const GAMES = ['전체', '포켓몬', '유희왕', '원피스', 'MTG', '스포츠', '기타'] as const;
export const RARS: Rarity[] = ['C', 'U', 'R', 'SR', 'HR', 'S'];

export const gameColors: Record<Game, string> = {
  포켓몬: '#E63946',
  유희왕: '#7C3AED',
  원피스: '#F97316',
  MTG: '#22C55E',
  스포츠: '#3A5BD9',
  기타: '#94A3B8',
};

export const rarityBg: Record<Rarity, string> = {
  C: '#475569',
  U: '#22C55E',
  R: '#3A5BD9',
  SR: '#7C3AED',
  HR: '#EC4899',
  S: '#FFD23F',
};

export const rarityFg: Record<Rarity, string> = {
  C: '#FFFFFF',
  U: '#0F172A',
  R: '#FFFFFF',
  SR: '#FFFFFF',
  HR: '#FFFFFF',
  S: '#0F172A',
};

export function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

/** Display-formatted price. Cards that couldn't be priced (TCGdex miss +
 *  no local DB row) end up with price=0 — show that as "시세 미확인" rather
 *  than "₩0" which reads as "free" / dummy data. */
export function priceLabel(price: number): string {
  if (!price || price <= 0) return '시세 미확인';
  return `₩${fmt(price)}`;
}

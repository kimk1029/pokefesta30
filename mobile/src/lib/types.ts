export type CongLevel = 'empty' | 'normal' | 'busy' | 'full';

export interface Place {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  level: CongLevel;
  mins: number;
  count: number;
}

export interface Trade {
  id: number;
  type: 'sell' | 'buy';
  title: string;
  place: string;
  time: string;
  price: string;
}

export interface FeedItem {
  id: number;
  place: string;
  level: CongLevel;
  text: string;
  time: string;
  user: string;
}

export interface MyProfile {
  name: string;
  avatar: string;
  starter: string;
  title: string;
  level: number;
  maxLevel: number;
  xp: number;
  xpNeeded: number;
  rating: string;
  cardCount: number;
  tradeCount: number;
  savedCount: number;
  points: number;
}

export type OripaTier = 'normal' | 'rare' | 'legend';
export type OripaGrade = 'S' | 'A' | 'B' | 'C' | 'last';

export interface OripaBox {
  id: string;
  tier: OripaTier;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  odds: string;
}

export interface OripaResult {
  id: number;
  user: string;
  box: string;
  reward: string;
  emoji: string;
  tier: OripaTier;
  time: string;
}

export interface OripaTicket {
  index: number;
  drawn: boolean;
  grade?: OripaGrade;
  prizeName?: string;
  prizeEmoji?: string;
  drawnBy?: string;
  drawnAt?: string;
}

export interface ShopItem {
  id: string;
  category: 'charge' | 'ticket' | 'skin';
  emoji: string;
  bg: string;
  name: string;
  desc: string;
  price: number;
  tag?: 'hot' | 'new' | 'limited';
}

export interface MessageThread {
  peerId: string;
  peerName: string;
  peerAvatar: string;
  lastText: string;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
  time: string;
}

export type CardRarity = 'C' | 'U' | 'R' | 'SR' | 'HR' | 'S';

export interface CardItem {
  id: string;
  name: string;
  set: string;
  price: number;
  history: number[];
  delta: number;
  /** 보유 여부 — undefined 는 보유로 취급(과거 데이터 호환). */
  owned?: boolean;
  /** 게임 분류 (포켓몬/유희왕/원피스/MTG/스포츠/기타). */
  game?: string;
  /** 디자인 희귀도. 카탈로그가 다른 grade 체계를 쓰면 매핑해서 채움. */
  rar?: CardRarity;
  /** PSA 그레이드 (10/9/8/...) — 없으면 미그레이딩. */
  grade?: number | null;
  /** 카드 썸네일 이모지. */
  emoji?: string;
}

export type CongestionLevel = 'empty' | 'normal' | 'busy' | 'full';

export type TradeType = 'buy' | 'sell';

export interface Place {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  level: CongestionLevel;
  mins: number;
  count: number;
}

export interface Trade {
  id: number;
  type: TradeType;
  title: string;
  place: string;
  time: string;
  price: string;
  kakaoId?: string | null;
  bumpCount?: number;
}

export interface FeedItem {
  id: number;
  place: string;
  level: CongestionLevel;
  text: string;
  time: string;
  user: string;
}

export type TradeStatus = 'open' | 'reserved' | 'done' | 'cancelled';

export interface TradeDetail extends Trade {
  body: string;
  status: TradeStatus;
  authorEmoji: string;
  authorId?: string | null;
}

export interface FeedPost {
  id: number;
  place: string | null;
  text: string;
  time: string;
  user: string;
}

export type ShopCategory = 'charge' | 'ticket' | 'skin';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  emoji: string;
  bg: string;
  name: string;
  desc: string;
  price: number;
  tag?: 'hot' | 'new' | 'limited';
}

export type OripaTier = 'normal' | 'rare' | 'legend';

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

export type StarterId = 'bulbasaur' | 'charmander' | 'squirtle';

export interface MyProfile {
  name: string;
  avatar: string;
  starter: StarterId;
  title: string;
  level: number;
  maxLevel: number;
  xp: number;
  xpNeeded: number;
  rating: string;
  reportCount: number;
  tradeCount: number;
  savedCount: number;
  points: number;
}

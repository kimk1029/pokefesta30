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
}

export interface FeedItem {
  id: number;
  place: string;
  level: CongestionLevel;
  text: string;
  time: string;
  user: string;
}

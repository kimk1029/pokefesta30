/**
 * /api/me/* 응답 타입 + 호출 함수.
 *
 * 응답 타입은 웹 [[src/lib/queries.ts]] / [[src/lib/messages.ts]] 의 반환 모양과 1:1.
 * 모바일이 자체 mock 으로 폴백할 수 있도록 [[ApiError]] 를 그대로 던진다.
 */
import { api } from './apiClient';

export type TradeType = 'buy' | 'sell';
export type TradeStatus = 'open' | 'reserved' | 'done' | 'cancelled';
export type OripaTier = 'normal' | 'rare' | 'legend';

export interface MyTrade {
  id: number;
  type: TradeType;
  status?: TradeStatus;
  title: string;
  place: string;
  time: string;
  price: string;
  kakaoId?: string | null;
}

export interface MyFeedPost {
  id: number;
  text: string;
  time: string;
  createdAt: string;
  user: string;
  authorName?: string | null;
  authorBgId?: string;
  authorFrameId?: string;
  images?: string[];
}

export interface MyBookmarks {
  trades: MyTrade[];
  feeds: MyFeedPost[];
}

export interface MyCardRow {
  id: number;
  cardId: string | null;
  ocrSetCode: string | null;
  ocrCardNumber: string | null;
  nickname: string | null;
  memo: string | null;
  gradeEstimate: string | null;
  centeringScore: number | null;
  photoUrl: string | null;
  createdAt: string;
  latestPrice?: number;
  trend?: number[];
}

export interface MessageThread {
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerBgId: string;
  peerFrameId: string;
  lastText: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
}

export interface OripaBox {
  id: string;
  tier: OripaTier;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  odds: string;
  stats?: {
    total: number;
    remaining: number;
    drawn: { S: number; A: number; B: number; C: number };
  };
}

export interface InventorySnapshot {
  avatar: string;
  avatarOwned: string[];
  bg: string;
  bgOwned: string[];
  frame: string;
  frameOwned: string[];
  points: number;
}

export interface LevelInfo {
  level: number;
  nextThreshold: number;
  progress: number;
}

export interface MySummary {
  user: { id: string; name: string | null; email: string | null };
  inventory: InventorySnapshot;
  level: LevelInfo;
  counts: { tradeCount: number; savedCount: number; cardCount: number };
}

/* --- endpoints ---------------------------------------------------- */

export function fetchMySummary(): Promise<MySummary> {
  return api<MySummary>('/api/me/summary');
}

export function fetchMyTrades(): Promise<MyTrade[]> {
  return api<{ data: MyTrade[] }>('/api/me/trades').then((r) => r.data);
}

export function fetchMyFeeds(): Promise<MyFeedPost[]> {
  return api<{ data: MyFeedPost[] }>('/api/me/feeds').then((r) => r.data);
}

export function fetchMyBookmarks(): Promise<MyBookmarks> {
  return api<{ data: MyBookmarks }>('/api/me/bookmarks').then((r) => r.data);
}

export function fetchMyCards(): Promise<MyCardRow[]> {
  return api<{ data: MyCardRow[] }>('/api/me/cards/with-prices').then((r) => r.data);
}

export function fetchMessageThreads(): Promise<MessageThread[]> {
  return api<{ data: MessageThread[] }>('/api/messages').then((r) => r.data);
}

export function fetchOripaBoxes(): Promise<OripaBox[]> {
  return api<{ data: OripaBox[] }>('/api/oripa', { auth: false }).then((r) => r.data);
}

export type ShopKind = 'avatar' | 'bg' | 'frame';
export type ShopAction = 'buy' | 'pick';

export interface BuyResult {
  ok: boolean;
  inv?: InventorySnapshot;
  error?: string;
}

export function buyOrPick(action: ShopAction, kind: ShopKind, id: string, price = 0): Promise<BuyResult> {
  return api<BuyResult>('/api/me/inventory/buy', {
    method: 'POST',
    body: { action, kind, id, price },
  });
}

export function fetchInventory(): Promise<{ inventory: InventorySnapshot }> {
  return api<{ inventory: InventorySnapshot }>('/api/me/inventory');
}

/* --- card packs (snkrdunk hit cards per pack) -------------------- */

export interface PackHitCard {
  apparelId: number;
  name: string;
  koName?: string;
  shortName: string;
  itemKind?: 'single' | 'box' | 'other';
  imageUrl: string | null;
  minPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  productNumber: string;
  lastSalePrice?: number;
  lastSaleText?: string;
  lastSaleSort?: number;
}

export interface PackWithHits {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
  boxImageUrl?: string | null;
  boxName?: string | null;
  boxKoName?: string | null;
  hits: PackHitCard[];
}

export function fetchAllPacksWithHits(limit = 12): Promise<PackWithHits[]> {
  return api<{ data: PackWithHits[] }>(`/api/card-packs?withHits=1&limit=${limit}`, { auth: false }).then((r) => r.data);
}

export function fetchPackHits(code: string, limit = 30): Promise<PackWithHits | null> {
  return api<{ data: PackWithHits }>(`/api/card-packs/${encodeURIComponent(code)}?limit=${limit}`, { auth: false })
    .then((r) => r.data)
    .catch(() => null);
}

/**
 * /api/me/* 응답 타입 + 호출 함수.
 *
 * 응답 타입은 웹 [[src/lib/queries.ts]] / [[src/lib/messages.ts]] 의 반환 모양과 1:1.
 * 모바일이 자체 mock 으로 폴백할 수 있도록 [[ApiError]] 를 그대로 던진다.
 */
import { api } from './apiClient';
import { CARD_PACKS, getCardPack, type CardPackMeta } from '@/data/cardPacks';
import { localizeCardName } from './cardNameKo';
import {
  fetchAllSnkrdunkApparelGroup,
  fetchSnkrdunkApparelGroup,
  type SnkrdunkApparel,
} from '@/services/snkrdunk';

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
  snkrdunkApparelId: number | null;
  nickname: string | null;
  memo: string | null;
  gradeEstimate: string | null;
  centeringScore: number | null;
  photoUrl: string | null;
  createdAt: string;
  latestPrice?: number;
  trend?: number[];
  snkrdunkName?: string | null;
  snkrdunkImageUrl?: string | null;
  snkrdunkMinPriceJpy?: number;
  /** raw 싱글카드 중앙값 시세. */
  priceSingleJpy?: number;
  /** PSA10 중앙값 시세 (있으면). */
  pricePsa10Jpy?: number;
}

export interface MyFavoriteRow {
  id: number;
  snkrdunkApparelId: number;
  createdAt: string;
  name: string | null;
  imageUrl: string | null;
  minPriceJpy: number;
}

export interface PortfolioSummary {
  totalJpy: number;
  totalPsa10Jpy?: number;
  pricedCount: number;
  pricedPsa10Count?: number;
  totalCount: number;
  yesterdayJpy: number | null;
  changeAbsJpy: number | null;
  changePct: number | null;
  history: Array<{ date: string; totalJpy: number }>;
  asOfDate: string;
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

export function fetchMyFavorites(): Promise<MyFavoriteRow[]> {
  return api<{ data: MyFavoriteRow[] }>('/api/me/favorites/with-prices').then((r) => r.data);
}

export function fetchPortfolio(): Promise<PortfolioSummary> {
  return api<{ data: PortfolioSummary }>('/api/me/portfolio').then((r) => r.data);
}

export function removeFavorite(apparelId: number): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/me/favorites/${apparelId}`, { method: 'DELETE' });
}

export function deleteMyCard(id: number): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/me/cards/${id}`, { method: 'DELETE' });
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

export async function fetchAllPacksWithHits(limit = 12): Promise<PackWithHits[]> {
  return runWithConcurrency(CARD_PACKS, 8, (pack) => resolvePack(pack, limit));
}

export async function fetchPackHits(code: string, limit = 30): Promise<PackWithHits | null> {
  const pack = getCardPack(code);
  if (!pack) return null;
  return resolvePack(pack, limit);
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await task(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function resolvePack(pack: CardPackMeta, limit: number): Promise<PackWithHits> {
  const singlesPerPage = Math.min(Math.max(limit * 4, 20), 100);
  const [singles, boxesPage] = await Promise.all([
    limit <= 12
      ? fetchSnkrdunkApparelGroup(pack.apparelGroupId, {
          apparelCategoryId: 25,
          page: 1,
          perPage: singlesPerPage,
        }).then((p) => p?.apparels ?? [])
      : fetchAllSnkrdunkApparelGroup(pack.apparelGroupId, {
          apparelCategoryId: 25,
          maxItems: Math.max(limit, 100),
        }),
    fetchSnkrdunkApparelGroup(pack.apparelGroupId, {
      apparelCategoryId: 14,
      page: 1,
      perPage: 5,
    }),
  ]);
  const hits = singles.filter((a) => a.minPrice > 0).slice(0, limit).map(toHitCard);
  const box = (boxesPage?.apparels ?? []).find((a) => a.minPrice > 0) ?? boxesPage?.apparels?.[0] ?? null;
  return {
    code: pack.code,
    name: pack.name,
    shortName: pack.shortName,
    emoji: pack.emoji,
    bg: pack.bg,
    releasedAt: pack.releasedAt,
    boxImageUrl: box?.imageUrl ?? null,
    boxName: box?.localizedName ?? null,
    boxKoName: box ? localizeCardName(box.localizedName) : null,
    hits,
  };
}

function toHitCard(a: SnkrdunkApparel): PackHitCard {
  const jp = a.localizedName || a.name;
  const ko = localizeCardName(jp);
  return {
    apparelId: a.id,
    name: jp,
    koName: ko,
    shortName: shortenName(ko),
    itemKind: a.itemKind,
    imageUrl: a.imageUrl,
    minPrice: a.minPrice,
    displayPrice: a.displayPrice,
    listingCount: a.listingCount,
    listingCountText: a.listingCountText,
    productNumber: a.productNumber,
  };
}

function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 22 ? `${cut.slice(0, 21)}…` : cut;
}

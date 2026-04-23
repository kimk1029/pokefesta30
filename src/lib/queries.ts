import {
  DEFAULT_AVATAR,
  DEFAULT_OWNED,
  isAvatarId,
  type AvatarId,
} from './avatars';
import {
  FEED as MOCK_FEED,
  PLACES as MOCK_PLACES,
  TRADES as MOCK_TRADES,
} from './data';
import { prisma } from './prisma';
import {
  DEFAULT_BG,
  DEFAULT_FRAME,
  isBackgroundId,
  isFrameId,
  type BackgroundId,
  type FrameId,
} from './shop';
import type {
  CongestionLevel,
  FeedItem,
  FeedKind,
  FeedPost,
  Place,
  Trade,
  TradeDetail,
  TradeStatus,
  TradeType,
} from './types';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function minsSince(iso: Date | string | null | undefined): number {
  if (!iso) return 9_999;
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

function relTime(iso: Date | string): string {
  const mins = minsSince(iso);
  if (mins <= 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function asCongestionLevel(s: string | null | undefined): CongestionLevel | null {
  if (!s) return null;
  const allowed = ['empty', 'normal', 'busy', 'full'] as const;
  return allowed.includes(s as CongestionLevel) ? (s as CongestionLevel) : null;
}

function asTradeStatus(s: string): TradeStatus {
  return (['open', 'reserved', 'done', 'cancelled'] as const).includes(s as TradeStatus)
    ? (s as TradeStatus)
    : 'open';
}

function asFeedKind(s: string): FeedKind {
  return s === 'report' ? 'report' : 'general';
}

type FeedRow = {
  id: number;
  kind: string;
  level: string | null;
  placeId: string | null;
  text: string;
  authorEmoji: string;
  authorBgId?: string;
  authorFrameId?: string;
  createdAt: Date;
  place: { name: string } | null;
};

function toFeedPost(r: FeedRow): FeedPost {
  return {
    id: r.id,
    kind: asFeedKind(r.kind),
    level: asCongestionLevel(r.level),
    place: r.place?.name ?? null,
    placeId: r.placeId,
    text: r.text,
    time: relTime(r.createdAt),
    createdAt: r.createdAt.toISOString(),
    user: r.authorEmoji ?? '🐣',
    authorBgId: r.authorBgId,
    authorFrameId: r.authorFrameId,
  };
}

/* ------------------------------------------------------------------ */
/* reads                                                               */
/* ------------------------------------------------------------------ */

export async function getPlaces(): Promise<Place[]> {
  try {
    const rows = await prisma.place.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      bg: r.bg,
      level: asCongestionLevel(r.level) ?? 'empty',
      mins: minsSince(r.lastReportAt),
      count: r.count,
    }));
  } catch (err) {
    console.error('[getPlaces] fallback to mock:', err);
    return MOCK_PLACES;
  }
}

/**
 * 통합 피드 조회 — cursor 기반 페이지네이션.
 * - kind 미지정 : 모든 종류
 * - cursor (ISO timestamp of last item's createdAt) 다음 페이지 시작점
 * - 반환: { items, nextCursor }
 */
export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
}

export async function getFeedPage(opts: {
  kind?: FeedKind;
  cursor?: string | null;
  limit?: number;
  authorId?: string;
} = {}): Promise<FeedPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  try {
    const rows = await prisma.feed.findMany({
      where: {
        ...(opts.kind ? { kind: opts.kind } : {}),
        ...(opts.authorId ? { authorId: opts.authorId } : {}),
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { place: { select: { name: true } } },
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map(toFeedPost);
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt.toISOString() : null;
    return { items, nextCursor };
  } catch (err) {
    console.error('[getFeedPage] fallback:', err);
    return { items: [], nextCursor: null };
  }
}

/** 편의 — 첫 페이지만 받고 싶을 때. 기존 getFeedPosts 대체. */
export async function getFeedPosts(limit = 30, kind?: FeedKind): Promise<FeedPost[]> {
  const { items } = await getFeedPage({ limit, kind });
  return items;
}

/**
 * 최근 제보 — LiveScreen "최근 제보" 섹션 용.
 * 통합 Feed 테이블에서 kind='report' 만 읽음.
 */
export async function getReports(limit = 20): Promise<FeedItem[]> {
  const { items } = await getFeedPage({ kind: 'report', limit });
  return items.map((p) => ({
    id: p.id,
    place: p.place ?? '알 수 없음',
    level: (p.level ?? 'normal') as CongestionLevel,
    text: p.text,
    time: p.time,
    user: p.user,
  }));
}

/** 구 호환 alias */
export const getFeed = getReports;

export async function getTrades(filter: 'all' | TradeType = 'all'): Promise<Trade[]> {
  try {
    const rows = await prisma.trade.findMany({
      where: filter === 'all' ? {} : { type: filter },
      orderBy: { bumpedAt: 'desc' },
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type as TradeType,
      title: r.title,
      place: r.place?.name ?? '',
      time: relTime(r.bumpedAt ?? r.createdAt),
      price: r.price ?? '제안',
      kakaoId: r.kakaoId ?? null,
      bumpCount: r.bumpCount,
    }));
  } catch (err) {
    console.error('[getTrades] fallback to mock:', err);
    return filter === 'all' ? MOCK_TRADES : MOCK_TRADES.filter((t) => t.type === filter);
  }
}

export async function getTradeById(id: number): Promise<TradeDetail | null> {
  try {
    const r = await prisma.trade.findUnique({
      where: { id },
      include: { place: { select: { name: true } } },
    });
    if (!r) return null;
    return {
      id: r.id,
      type: r.type as TradeType,
      title: r.title,
      body: r.body,
      price: r.price ?? '제안',
      place: r.place?.name ?? '',
      time: relTime(r.bumpedAt ?? r.createdAt),
      status: asTradeStatus(r.status),
      authorEmoji: r.authorEmoji,
      authorBgId: r.authorBgId,
      authorFrameId: r.authorFrameId,
      authorId: r.authorId ?? null,
      kakaoId: r.kakaoId ?? null,
      bumpCount: r.bumpCount,
    };
  } catch (err) {
    console.error('[getTradeById]', err);
    return null;
  }
}

export async function getMyFeeds(userId: string, limit = 30, kind?: FeedKind): Promise<FeedPost[]> {
  const { items } = await getFeedPage({ authorId: userId, kind, limit });
  return items;
}

export async function getMyTrades(userId: string, limit = 30): Promise<Trade[]> {
  try {
    const rows = await prisma.trade.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type as TradeType,
      title: r.title,
      place: r.place?.name ?? '',
      time: relTime(r.createdAt),
      price: r.price ?? '제안',
      kakaoId: r.kakaoId ?? null,
    }));
  } catch (err) {
    console.error('[getMyTrades]', err);
    return [];
  }
}

export async function getMyReports(userId: string, limit = 30): Promise<FeedItem[]> {
  const { items } = await getFeedPage({ authorId: userId, kind: 'report', limit });
  return items.map((p) => ({
    id: p.id,
    place: p.place ?? '알 수 없음',
    level: (p.level ?? 'normal') as CongestionLevel,
    text: p.text,
    time: p.time,
    user: p.user,
  }));
}

export async function getMyBookmarks(
  userId: string,
  limit = 30,
): Promise<{ trades: Trade[]; feeds: FeedPost[] }> {
  try {
    const rows = await prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        trade: { include: { place: { select: { name: true } } } },
        feed: { include: { place: { select: { name: true } } } },
      },
    });
    const trades: Trade[] = [];
    const feeds: FeedPost[] = [];
    for (const b of rows) {
      if (b.trade) {
        trades.push({
          id: b.trade.id,
          type: b.trade.type as TradeType,
          title: b.trade.title,
          place: b.trade.place?.name ?? '',
          time: relTime(b.trade.createdAt),
          price: b.trade.price ?? '제안',
        });
      }
      if (b.feed) {
        feeds.push(toFeedPost(b.feed));
      }
    }
    return { trades, feeds };
  } catch (err) {
    console.error('[getMyBookmarks]', err);
    return { trades: [], feeds: [] };
  }
}

/* ------------------------------------------------------------------ */
/* inventory (프로필/포인트/보유 아이템)                                  */
/* ------------------------------------------------------------------ */

export interface InventorySnapshot {
  avatar: AvatarId;
  avatarOwned: AvatarId[];
  bg: BackgroundId;
  bgOwned: BackgroundId[];
  frame: FrameId;
  frameOwned: FrameId[];
  points: number;
}

const DEFAULT_INVENTORY: InventorySnapshot = {
  avatar: DEFAULT_AVATAR,
  avatarOwned: DEFAULT_OWNED,
  bg: DEFAULT_BG,
  bgOwned: [DEFAULT_BG],
  frame: DEFAULT_FRAME,
  frameOwned: [DEFAULT_FRAME],
  points: 0,
};

export async function getMyInventory(userId: string): Promise<InventorySnapshot> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return DEFAULT_INVENTORY;
    return {
      avatar: isAvatarId(u.avatarId) ? (u.avatarId as AvatarId) : DEFAULT_AVATAR,
      avatarOwned: u.ownedAvatars.filter(isAvatarId) as AvatarId[],
      bg: isBackgroundId(u.backgroundId) ? (u.backgroundId as BackgroundId) : DEFAULT_BG,
      bgOwned: u.ownedBackgrounds.filter(isBackgroundId) as BackgroundId[],
      frame: isFrameId(u.frameId) ? (u.frameId as FrameId) : DEFAULT_FRAME,
      frameOwned: u.ownedFrames.filter(isFrameId) as FrameId[],
      points: u.points,
    };
  } catch (err) {
    console.error('[getMyInventory]', err);
    return DEFAULT_INVENTORY;
  }
}

export async function getTodayReportCount(): Promise<number> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return await prisma.feed.count({
      where: { kind: 'report', createdAt: { gte: start } },
    });
  } catch (err) {
    console.error('[getTodayReportCount] fallback:', err);
    return MOCK_FEED.length;
  }
}

import {
  FEED as MOCK_FEED,
  PLACES as MOCK_PLACES,
  TRADES as MOCK_TRADES,
} from './data';
import { prisma } from './prisma';
import type {
  CongestionLevel,
  FeedItem,
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

function asCongestionLevel(s: string): CongestionLevel {
  return (['empty', 'normal', 'busy', 'full'] as const).includes(s as CongestionLevel)
    ? (s as CongestionLevel)
    : 'normal';
}

function asTradeStatus(s: string): TradeStatus {
  return (['open', 'reserved', 'done', 'cancelled'] as const).includes(s as TradeStatus)
    ? (s as TradeStatus)
    : 'open';
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
      level: asCongestionLevel(r.level),
      mins: minsSince(r.lastReportAt),
      count: r.count,
    }));
  } catch (err) {
    console.error('[getPlaces] fallback to mock:', err);
    return MOCK_PLACES;
  }
}

/** 최근 제보 — LiveScreen "최근 제보" 섹션에서 사용 */
export async function getReports(limit = 20): Promise<FeedItem[]> {
  try {
    const rows = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      place: r.place?.name ?? '알 수 없음',
      level: asCongestionLevel(r.level),
      text: r.note ?? '',
      time: relTime(r.createdAt),
      user: r.authorEmoji ?? '🐣',
    }));
  } catch (err) {
    console.error('[getReports] fallback to mock:', err);
    return MOCK_FEED.slice(0, limit);
  }
}

/** 기존 호환 (reports 기반) */
export const getFeed = getReports;

/** 잡담 피드 — FeedScreen "현장 피드" 에서 사용 (reports 와 분리) */
export async function getFeedPosts(limit = 30): Promise<FeedPost[]> {
  try {
    const rows = await prisma.feed.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      place: r.place?.name ?? null,
      text: r.text,
      time: relTime(r.createdAt),
      user: r.authorEmoji ?? '🐣',
    }));
  } catch (err) {
    console.error('[getFeedPosts] fallback to empty:', err);
    return [];
  }
}

export async function getTrades(filter: 'all' | TradeType = 'all'): Promise<Trade[]> {
  try {
    const rows = await prisma.trade.findMany({
      where: filter === 'all' ? {} : { type: filter },
      orderBy: { createdAt: 'desc' },
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type as TradeType,
      title: r.title,
      place: r.place?.name ?? '',
      time: relTime(r.createdAt),
      price: r.price ?? '제안',
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
      time: relTime(r.createdAt),
      status: asTradeStatus(r.status),
      authorEmoji: r.authorEmoji,
    };
  } catch (err) {
    console.error('[getTradeById]', err);
    return null;
  }
}

export async function getMyFeeds(userId: string, limit = 30): Promise<FeedPost[]> {
  try {
    const rows = await prisma.feed.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      place: r.place?.name ?? null,
      text: r.text,
      time: relTime(r.createdAt),
      user: r.authorEmoji ?? '🐣',
    }));
  } catch (err) {
    console.error('[getMyFeeds]', err);
    return [];
  }
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
    }));
  } catch (err) {
    console.error('[getMyTrades]', err);
    return [];
  }
}

export async function getMyReports(userId: string, limit = 30): Promise<FeedItem[]> {
  try {
    const rows = await prisma.report.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { place: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      place: r.place?.name ?? '알 수 없음',
      level: asCongestionLevel(r.level),
      text: r.note ?? '',
      time: relTime(r.createdAt),
      user: r.authorEmoji ?? '🐣',
    }));
  } catch (err) {
    console.error('[getMyReports]', err);
    return [];
  }
}

export async function getMyBookmarks(userId: string, limit = 30): Promise<{ trades: Trade[]; feeds: FeedPost[] }> {
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
        feeds.push({
          id: b.feed.id,
          place: b.feed.place?.name ?? null,
          text: b.feed.text,
          time: relTime(b.feed.createdAt),
          user: b.feed.authorEmoji ?? '🐣',
        });
      }
    }
    return { trades, feeds };
  } catch (err) {
    console.error('[getMyBookmarks]', err);
    return { trades: [], feeds: [] };
  }
}

export async function getTodayReportCount(): Promise<number> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return await prisma.report.count({ where: { createdAt: { gte: start } } });
  } catch (err) {
    console.error('[getTodayReportCount] fallback:', err);
    return MOCK_FEED.length;
  }
}

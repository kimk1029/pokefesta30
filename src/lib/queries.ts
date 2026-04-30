import { unstable_cache } from 'next/cache';
import {
  DEFAULT_AVATAR,
  DEFAULT_OWNED,
  isAvatarId,
  type AvatarId,
} from './avatars';
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
  images?: unknown;
  createdAt: Date;
  place: { name: string } | null;
  author?: { name: string | null } | null;
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
    authorName: r.author?.name ?? null,
    authorBgId: r.authorBgId,
    authorFrameId: r.authorFrameId,
    images: asImages(r.images),
  };
}

/* ------------------------------------------------------------------ */
/* reads                                                               */
/* ------------------------------------------------------------------ */

/** 첫 배포 / 빈 Supabase 를 위한 장소 기본 시드. 스탬프 6곳 + 참고 장소. */
const DEFAULT_PLACES = [
  { id: 'shoe',     name: '성수 구두 테마공원',      emoji: '👟', bg: '#FB923C' },
  { id: 'trend',    name: '포켓몬 30주년 파티 팝업', emoji: '🎊', bg: '#FFD23F' },
  { id: 'metamong', name: '메타몽 놀이터',          emoji: '🎪', bg: '#4ADE80' },
  { id: 'rainbow',  name: '어린이 무지개 공원',     emoji: '🌈', bg: '#6FC0E5' },
  { id: 'secret',   name: '포켓몬 시크릿 포레스트',  emoji: '🌲', bg: '#6B3FA0' },
  { id: 'seongsu',  name: '성수역 부근',            emoji: '🚇', bg: '#E63946' },
  { id: 'seoulsup', name: '서울숲역 부근',          emoji: '🌳', bg: '#4ADE80' },
];

async function _getPlaces(): Promise<Place[]> {
  try {
    let rows = await prisma.place.findMany({ orderBy: { id: 'asc' } });
    if (rows.length === 0) {
      await prisma.place.createMany({ data: DEFAULT_PLACES, skipDuplicates: true });
      rows = await prisma.place.findMany({ orderBy: { id: 'asc' } });
    }
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
    console.error('[getPlaces]', err);
    return [];
  }
}

export const getPlaces = unstable_cache(_getPlaces, ['places'], { revalidate: 60, tags: ['places'] });

/**
 * 오늘(KST 기준 00:00~) 시간대별 피드 건수 24개 + 현재 KST 시(hour).
 * report + general 전체 피드 집계 (현황 + 피드양 합산).
 * 서버 TZ 와 무관하게 Asia/Seoul 기준으로 버킷팅.
 */
const KST_HOUR_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  hour12: false,
});
const KST_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function kstHour(d: Date): number {
  const s = KST_HOUR_FMT.format(d);
  // en-US 의 '24' (자정 이후)을 0 으로 정규화
  const n = Number(s);
  return n >= 24 ? 0 : n;
}

function kstStartOfDayUtc(now: Date = new Date()): Date {
  const ymd = KST_DATE_FMT.format(now); // 'YYYY-MM-DD' (KST 날짜)
  // KST 00:00 → UTC 로는 해당 날 전날 15:00
  return new Date(`${ymd}T00:00:00+09:00`);
}

export async function getHourlyReportCounts(): Promise<{ counts: number[]; nowHour: number }> {
  const now = new Date();
  const nowHour = kstHour(now);
  try {
    const start = kstStartOfDayUtc(now);
    // SQL GROUP BY로 집계 — 행 전체 fetch 대신 DB에서 바로 시간대별 카운트
    const rows = await prisma.$queryRaw<Array<{ h: number; cnt: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Seoul')::int AS h,
             COUNT(*)::bigint AS cnt
      FROM "Feed"
      WHERE "createdAt" >= ${start}
      GROUP BY h
    `;
    const counts = new Array<number>(24).fill(0);
    for (const r of rows) {
      const h = Number(r.h);
      if (h >= 0 && h < 24) counts[h] = Number(r.cnt);
    }
    return { counts, nowHour };
  } catch (err) {
    console.error('[getHourlyReportCounts]', err);
    return { counts: new Array<number>(24).fill(0), nowHour: kstHour(new Date()) };
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
      include: {
        place: { select: { name: true } },
        author: { select: { name: true } },
      },
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((r) =>
      toFeedPost({
        ...r,
        // 레거시 row 에 컬럼이 없을 경우 안전한 기본값
        authorBgId: (r as unknown as { authorBgId?: string }).authorBgId ?? 'default',
        authorFrameId: (r as unknown as { authorFrameId?: string }).authorFrameId ?? 'none',
      }),
    );
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt.toISOString() : null;
    return { items, nextCursor };
  } catch (err) {
    console.error('[getFeedPage] query failed:', err);
    return { items: [], nextCursor: null };
  }
}

/** 편의 — 첫 페이지만 받고 싶을 때. 기존 getFeedPosts 대체. */
export async function getFeedPosts(limit = 30, kind?: FeedKind): Promise<FeedPost[]> {
  const { items } = await getFeedPage({ limit, kind });
  return items;
}

function asImages(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((u): u is string => typeof u === 'string' && u.length > 0);
  return [];
}

export async function getTrades(filter: 'all' | TradeType = 'all', limit = 60): Promise<Trade[]> {
  try {
    const rows = await prisma.trade.findMany({
      where: filter === 'all' ? {} : { type: filter },
      orderBy: [{ bumpedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        place: { select: { name: true } },
        author: { select: { name: true } },
      },
    });

    // 거래글별 "1:1 채팅 중인 사용자 수" 집계 (메시지 개수 아님).
    // 작성자에게 메시지를 한 번이라도 보낸 unique senderId 의 개수.
    // 작성자 본인이 답장으로 보낸 메시지는 제외 → 순수하게 "관심을 보인 사람 수".
    const ids = rows.map((r) => r.id);
    let chatCounts: Record<number, number> = {};
    if (ids.length > 0) {
      const ownerById = new Map(rows.map((r) => [r.id, r.authorId]));
      const pairs = await prisma.message.groupBy({
        by: ['tradeId', 'senderId'],
        where: { tradeId: { in: ids } },
      });
      const setMap = new Map<number, Set<string>>();
      for (const m of pairs) {
        if (m.tradeId == null) continue;
        const owner = ownerById.get(m.tradeId) ?? null;
        if (owner && m.senderId === owner) continue; // 작성자 본인 제외
        const s = setMap.get(m.tradeId) ?? new Set<string>();
        s.add(m.senderId);
        setMap.set(m.tradeId, s);
      }
      chatCounts = Object.fromEntries(
        Array.from(setMap.entries()).map(([tid, s]) => [tid, s.size]),
      );
    }

    return rows.map((r) => ({
      id: r.id,
      type: r.type as TradeType,
      status: asTradeStatus(r.status),
      title: r.title,
      place: r.place?.name ?? '',
      time: relTime(r.bumpedAt ?? r.createdAt),
      price: r.price ?? '제안',
      kakaoId: r.kakaoId ?? null,
      bumpCount: r.bumpCount,
      chatCount: chatCounts[r.id] ?? 0,
      authorName: r.author?.name ?? '탈퇴',
      authorEmoji: r.authorEmoji,
      authorBgId: r.authorBgId,
      authorFrameId: r.authorFrameId,
      images: asImages((r as { images?: unknown }).images),
    }));
  } catch (err) {
    console.error('[getTrades]', err);
    return [];
  }
}

export async function getTradeById(id: number): Promise<TradeDetail | null> {
  try {
    const r = await prisma.trade.findUnique({
      where: { id },
      include: {
        place: { select: { name: true } },
        author: { select: { name: true } },
      },
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
      authorName: r.author?.name ?? '탈퇴',
      authorEmoji: r.authorEmoji,
      authorBgId: r.authorBgId,
      authorFrameId: r.authorFrameId,
      authorId: r.authorId ?? null,
      kakaoId: r.kakaoId ?? null,
      bumpCount: r.bumpCount,
      images: asImages((r as { images?: unknown }).images),
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

/* ------------------------------------------------------------------ */
/* hero banners                                                        */
/* ------------------------------------------------------------------ */

export interface HeroSlideRow {
  cls: 'slide-a' | 'slide-b' | 'slide-c' | 'slide-d';
  badge: string;
  title: string;
  sub: string;
  visualType: 'emoji' | 'image';
  visualValue: string;
  onClick: 'stamp-rally' | 'oripa' | null;
  ctaHint: string | null;
}

const SLIDE_CLASS_SET = new Set(['slide-a', 'slide-b', 'slide-c', 'slide-d']);
const VISUAL_TYPE_SET = new Set(['emoji', 'image']);
const ON_CLICK_SET = new Set(['stamp-rally', 'oripa']);

export async function getActiveHeroBanners(): Promise<HeroSlideRow[]> {
  try {
    const rows = await prisma.heroBanner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({
      cls: (SLIDE_CLASS_SET.has(r.slideClass) ? r.slideClass : 'slide-a') as HeroSlideRow['cls'],
      badge: r.badge,
      title: r.title,
      sub: r.sub,
      visualType: (VISUAL_TYPE_SET.has(r.visualType) ? r.visualType : 'emoji') as HeroSlideRow['visualType'],
      visualValue: r.visualValue,
      onClick: (r.onClick && ON_CLICK_SET.has(r.onClick) ? r.onClick : null) as HeroSlideRow['onClick'],
      ctaHint: r.ctaHint,
    }));
  } catch (err) {
    console.error('[getActiveHeroBanners]', err);
    return [];
  }
}

export const getTodayReportCount = unstable_cache(
  async (): Promise<number> => {
    try {
      const start = kstStartOfDayUtc();
      return await prisma.feed.count({
        where: { kind: 'report', createdAt: { gte: start } },
      });
    } catch (err) {
      console.error('[getTodayReportCount]', err);
      return 0;
    }
  },
  ['today-report-count'],
  { revalidate: 60, tags: ['feeds'] },
);

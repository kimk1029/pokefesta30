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

function relTime(iso: Date | string): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (mins <= 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function asTradeStatus(s: string): TradeStatus {
  return (['open', 'reserved', 'done', 'cancelled'] as const).includes(s as TradeStatus)
    ? (s as TradeStatus)
    : 'open';
}

type FeedRow = {
  id: number;
  text: string;
  authorEmoji: string;
  authorBgId?: string;
  authorFrameId?: string;
  images?: unknown;
  createdAt: Date;
  author?: { name: string | null } | null;
};

function toFeedPost(r: FeedRow): FeedPost {
  return {
    id: r.id,
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
/* places — 거래 만남 장소 (페스타 혼잡도 필드는 제거됨)                  */
/* ------------------------------------------------------------------ */

/** 첫 배포 / 빈 Supabase 를 위한 장소 기본 시드. 거래 시 만남 장소로 사용. */
const DEFAULT_PLACES = [
  { id: 'seongsu',  name: '성수역 부근',   emoji: '🚇', bg: '#E63946' },
  { id: 'seoulsup', name: '서울숲역 부근', emoji: '🌳', bg: '#4ADE80' },
];

export async function getPlaces(): Promise<Place[]> {
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
    }));
  } catch (err) {
    console.error('[getPlaces]', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* feeds                                                               */
/* ------------------------------------------------------------------ */

/**
 * 통합 피드 조회 — cursor 기반 페이지네이션.
 * 일반 커뮤니티 글만 다룸 (페스타 제보는 제거됨).
 */
export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
}

export async function getFeedPage(opts: {
  cursor?: string | null;
  limit?: number;
  authorId?: string;
} = {}): Promise<FeedPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  try {
    const rows = await prisma.feed.findMany({
      where: {
        ...(opts.authorId ? { authorId: opts.authorId } : {}),
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
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

/** 편의 — 첫 페이지만 받고 싶을 때. */
export async function getFeedPosts(limit = 30): Promise<FeedPost[]> {
  const { items } = await getFeedPage({ limit });
  return items;
}

function asImages(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((u): u is string => typeof u === 'string' && u.length > 0);
  return [];
}

/* ------------------------------------------------------------------ */
/* trades                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* my cards (UserCard 테이블)                                          */
/* ------------------------------------------------------------------ */

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
}

export async function getMyCards(userId: string, limit = 100): Promise<MyCardRow[]> {
  try {
    const rows = await prisma.userCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map((r) => ({
      id: r.id,
      cardId: r.cardId,
      ocrSetCode: r.ocrSetCode,
      ocrCardNumber: r.ocrCardNumber,
      nickname: r.nickname,
      memo: r.memo,
      gradeEstimate: r.gradeEstimate,
      centeringScore: r.centeringScore,
      photoUrl: r.photoUrl,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('[getMyCards]', err);
    return [];
  }
}

/**
 * 내 카드 + 각 카드의 최근 시세 스냅샷 (있으면) 결합.
 * 대시보드 포트폴리오 가치 계산용. 없는 카드는 price=0 으로 채워서 반환.
 */
export interface MyCardWithPrice extends MyCardRow {
  latestPrice: number;
  /** 최근 7개 스냅샷 평균값들 (오래된 → 최신). 데이터 부족 시 빈 배열. */
  trend: number[];
}

export async function getMyCardsWithPrices(
  userId: string,
  limit = 100,
): Promise<MyCardWithPrice[]> {
  const cards = await getMyCards(userId, limit);
  if (cards.length === 0) return [];

  const cardIds = Array.from(
    new Set(cards.map((c) => c.cardId).filter((id): id is string => Boolean(id))),
  );
  if (cardIds.length === 0) {
    return cards.map((c) => ({ ...c, latestPrice: 0, trend: [] }));
  }

  // 카드별 최근 7건 시세 스냅샷
  let snapshots: Array<{ cardId: string; avg: number; fetchedAt: Date }> = [];
  try {
    snapshots = await prisma.cardPriceSnapshot.findMany({
      where: { cardId: { in: cardIds } },
      orderBy: { fetchedAt: 'desc' },
      take: cardIds.length * 7,
      select: { cardId: true, avg: true, fetchedAt: true },
    });
  } catch (err) {
    console.error('[getMyCardsWithPrices] snapshot 조회 실패', err);
  }

  const byCard = new Map<string, Array<{ avg: number; fetchedAt: Date }>>();
  for (const s of snapshots) {
    const arr = byCard.get(s.cardId) ?? [];
    arr.push({ avg: s.avg, fetchedAt: s.fetchedAt });
    byCard.set(s.cardId, arr);
  }

  return cards.map((c) => {
    if (!c.cardId) return { ...c, latestPrice: 0, trend: [] };
    const list = byCard.get(c.cardId) ?? [];
    if (list.length === 0) return { ...c, latestPrice: 0, trend: [] };
    // findMany 가 desc 정렬이라 첫 번째가 최신
    const latest = list[0].avg;
    const trend = list.slice(0, 7).map((s) => s.avg).reverse();
    return { ...c, latestPrice: latest, trend };
  });
}

export async function countMyCards(userId: string): Promise<number> {
  try {
    return await prisma.userCard.count({ where: { userId } });
  } catch (err) {
    console.error('[countMyCards]', err);
    return 0;
  }
}

export async function getMyFeeds(userId: string, limit = 30): Promise<FeedPost[]> {
  const { items } = await getFeedPage({ authorId: userId, limit });
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
        feed: true,
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

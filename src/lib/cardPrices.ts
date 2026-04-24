/**
 * 카드 시세 오케스트레이션:
 *   최신 스냅샷이 10분 이내 -> DB 재사용
 *   그 이상 -> eBay Browse API fetch -> DB append -> 결과 반환
 *
 * Prisma 테이블이 없거나 eBay 키가 없으면 null 반환 — 호출자가 graceful 처리.
 */
import { searchEbayPrices, type EbayItemSummary } from './ebay';
import { prisma } from './prisma';

const STALE_MS = 10 * 60 * 1000;

export interface PriceSnapshotOut {
  cardId: string;
  currency: string;
  low: number;
  avg: number;
  median: number;
  high: number;
  sampleN: number;
  fetchedAt: string;
}

export interface PriceCurrent extends PriceSnapshotOut {
  /** 최신 fetch 시에만 포함 (DB 캐시엔 저장하지 않음) */
  items?: EbayItemSummary[];
}

export interface HistoryPoint {
  t: string;
  avg: number;
  low: number;
  high: number;
}

export async function getOrRefreshCardPrice(
  cardId: string,
  query: string,
): Promise<PriceCurrent | null> {
  try {
    const latest = await prisma.cardPriceSnapshot.findFirst({
      where: { cardId },
      orderBy: { fetchedAt: 'desc' },
    });
    const now = Date.now();
    const fresh = latest && now - latest.fetchedAt.getTime() < STALE_MS;
    if (latest && fresh) return toOut(latest);

    const remote = await searchEbayPrices(query);
    if (!remote) return latest ? toOut(latest) : null;

    const saved = await prisma.cardPriceSnapshot.create({
      data: {
        cardId,
        currency: remote.currency,
        low: remote.low,
        avg: remote.avg,
        median: remote.median,
        high: remote.high,
        sampleN: remote.sampleN,
      },
    });
    return { ...toOut(saved), items: remote.items };
  } catch (err) {
    console.error('[cardPrices.getOrRefresh]', err);
    return null;
  }
}

export async function getCardHistory(cardId: string, days = 30): Promise<HistoryPoint[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.cardPriceSnapshot.findMany({
      where: { cardId, fetchedAt: { gte: since } },
      orderBy: { fetchedAt: 'asc' },
    });
    return rows.map((r) => ({
      t: r.fetchedAt.toISOString(),
      avg: r.avg,
      low: r.low,
      high: r.high,
    }));
  } catch (err) {
    console.error('[cardPrices.getHistory]', err);
    return [];
  }
}

type DbRow = {
  cardId: string;
  currency: string;
  low: number;
  avg: number;
  median: number;
  high: number;
  sampleN: number;
  fetchedAt: Date;
};

function toOut(r: DbRow): PriceSnapshotOut {
  return {
    cardId: r.cardId,
    currency: r.currency,
    low: r.low,
    avg: r.avg,
    median: r.median,
    high: r.high,
    sampleN: r.sampleN,
    fetchedAt: r.fetchedAt.toISOString(),
  };
}

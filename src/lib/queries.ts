import { FEED as MOCK_FEED, PLACES as MOCK_PLACES, TRADES as MOCK_TRADES } from './data';
import { pool } from './db';
import type { CongestionLevel, FeedItem, Place, Trade, TradeType } from './types';

function minsSince(iso: string | Date | null | undefined): number {
  if (!iso) return 9_999;
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

function relTime(iso: string | Date): string {
  const mins = minsSince(iso);
  if (mins <= 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export async function getPlaces(): Promise<Place[]> {
  if (!pool) return MOCK_PLACES;
  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      emoji: string;
      bg: string;
      level: CongestionLevel;
      count: number;
      last_report_at: Date | null;
    }>(
      'SELECT id, name, emoji, bg, level, count, last_report_at FROM places ORDER BY id',
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      bg: r.bg,
      level: r.level,
      mins: minsSince(r.last_report_at),
      count: r.count ?? 0,
    }));
  } catch (err) {
    console.error('[getPlaces] fallback to mock:', err);
    return MOCK_PLACES;
  }
}

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  if (!pool) return MOCK_FEED.slice(0, limit);
  try {
    const { rows } = await pool.query<{
      id: number | string;
      place_name: string | null;
      level: CongestionLevel;
      note: string | null;
      created_at: Date;
      author: string | null;
    }>(
      `SELECT r.id, p.name AS place_name, r.level, r.note, r.created_at, r.author
       FROM reports r
       JOIN places p ON p.id = r.place_id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: Number(r.id),
      place: r.place_name ?? '알 수 없음',
      level: r.level,
      text: r.note ?? '',
      time: relTime(r.created_at),
      user: r.author ?? '🐣',
    }));
  } catch (err) {
    console.error('[getFeed] fallback to mock:', err);
    return MOCK_FEED.slice(0, limit);
  }
}

export async function getTrades(filter: 'all' | TradeType = 'all'): Promise<Trade[]> {
  if (!pool) {
    return filter === 'all' ? MOCK_TRADES : MOCK_TRADES.filter((t) => t.type === filter);
  }
  try {
    const params: unknown[] = [];
    let sql =
      `SELECT t.id, t.type, t.title, p.name AS place_name, t.price, t.created_at
       FROM trades t
       JOIN places p ON p.id = t.place_id`;
    if (filter !== 'all') {
      sql += ' WHERE t.type = $1';
      params.push(filter);
    }
    sql += ' ORDER BY t.created_at DESC';

    const { rows } = await pool.query<{
      id: number | string;
      type: TradeType;
      title: string;
      place_name: string | null;
      price: string | null;
      created_at: Date;
    }>(sql, params);

    return rows.map((r) => ({
      id: Number(r.id),
      type: r.type,
      title: r.title,
      place: r.place_name ?? '',
      time: relTime(r.created_at),
      price: r.price ?? '제안',
    }));
  } catch (err) {
    console.error('[getTrades] fallback to mock:', err);
    return filter === 'all' ? MOCK_TRADES : MOCK_TRADES.filter((t) => t.type === filter);
  }
}

/**
 * 오늘 00:00 이후 누적 제보 건수.
 */
export async function getTodayReportCount(): Promise<number> {
  if (!pool) return MOCK_FEED.length;
  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM reports WHERE created_at >= date_trunc('day', NOW())`,
    );
    return Number(rows[0]?.count ?? 0);
  } catch (err) {
    console.error('[getTodayReportCount] fallback to mock:', err);
    return MOCK_FEED.length;
  }
}

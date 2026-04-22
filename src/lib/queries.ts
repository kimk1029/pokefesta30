import { FEED as MOCK_FEED, PLACES as MOCK_PLACES, TRADES as MOCK_TRADES } from './data';
import { supabase } from './supabase';
import type { CongestionLevel, FeedItem, Place, Trade, TradeType } from './types';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function minsSince(iso: string | null | undefined): number {
  if (!iso) return 9_999;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function relTime(iso: string): string {
  const mins = minsSince(iso);
  if (mins <= 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

/* ------------------------------------------------------------------ */
/* reads                                                               */
/* ------------------------------------------------------------------ */

export async function getPlaces(): Promise<Place[]> {
  if (!supabase) return MOCK_PLACES;
  const { data, error } = await supabase.from('place_status').select('*');
  if (error || !data) return MOCK_PLACES;
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    emoji: row.emoji as string,
    bg: row.bg as string,
    level: (row.level as CongestionLevel) || 'empty',
    mins: minsSince(row.last_report_at as string | null),
    count: (row.count as number) ?? 0,
  }));
}

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  if (!supabase) return MOCK_FEED.slice(0, limit);
  const { data, error } = await supabase
    .from('reports')
    .select('id, level, note, created_at, author, places(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return MOCK_FEED.slice(0, limit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id as number,
    place: r.places?.name ?? '알 수 없음',
    level: r.level as CongestionLevel,
    text: (r.note as string) ?? '',
    time: relTime(r.created_at as string),
    user: '🐣',
  }));
}

export async function getTrades(filter: 'all' | TradeType = 'all'): Promise<Trade[]> {
  if (!supabase) {
    return filter === 'all' ? MOCK_TRADES : MOCK_TRADES.filter((t) => t.type === filter);
  }
  let q = supabase
    .from('trades')
    .select('id, type, title, body, price, created_at, places(name)')
    .order('created_at', { ascending: false });
  if (filter !== 'all') q = q.eq('type', filter);
  const { data, error } = await q;
  if (error || !data) {
    return filter === 'all' ? MOCK_TRADES : MOCK_TRADES.filter((t) => t.type === filter);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id as number,
    type: r.type as TradeType,
    title: r.title as string,
    place: r.places?.name ?? '',
    time: relTime(r.created_at as string),
    price: (r.price as string) || '제안',
  }));
}

/**
 * 오늘 00:00 이후 누적 제보 건수. (홈 차트 우상단 "오늘 N건" 표시용)
 * mock 모드일 때는 FEED 길이로 대체.
 */
export async function getTodayReportCount(): Promise<number> {
  if (!supabase) return MOCK_FEED.length;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start.toISOString());
  if (error || count == null) return MOCK_FEED.length;
  return count;
}

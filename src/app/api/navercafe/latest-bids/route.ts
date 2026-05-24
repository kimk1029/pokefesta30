import { NextResponse } from 'next/server';
import { fetchMvcLatestBids } from '@/lib/navercafe';

// 로컬 Route Handler — 여러 경매글의 '최종호가'(최신 댓글)를 한 번에 조회.
// ?ids=583863,583853&fresh=1  (fresh=1 이면 캐시 우회 = 새로고침)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return NextResponse.json({ bids: {} });
  const fresh = searchParams.get('fresh') === '1';
  const bids = await fetchMvcLatestBids(ids, { fresh });
  return NextResponse.json({ bids });
}

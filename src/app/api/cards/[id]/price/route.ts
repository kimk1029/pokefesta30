import { NextResponse } from 'next/server';
import { getOrRefreshCardPrice } from '@/lib/cardPrices';
import { findCardEntry } from '@/lib/cardsCatalog';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const entry = findCardEntry(params.id);
  if (!entry) return NextResponse.json({ error: 'unknown card' }, { status: 404 });

  const snap = await getOrRefreshCardPrice(entry.id, entry.ebayQuery);
  if (!snap) {
    return NextResponse.json({ data: null, reason: 'no data (eBay 키 미설정 또는 검색 결과 없음)' });
  }
  return NextResponse.json({ data: snap });
}

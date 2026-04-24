import { NextResponse, type NextRequest } from 'next/server';
import { getCardHistory } from '@/lib/cardPrices';
import { findCardEntry } from '@/lib/cardsCatalog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const entry = findCardEntry(params.id);
  if (!entry) return NextResponse.json({ error: 'unknown card' }, { status: 404 });

  const daysRaw = Number(req.nextUrl.searchParams.get('days') ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 30;
  const points = await getCardHistory(entry.id, days);
  return NextResponse.json({ data: points });
}

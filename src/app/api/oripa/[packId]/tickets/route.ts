import { NextResponse } from 'next/server';
import { getOripaTickets } from '@/lib/oripa';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { packId: string } }) {
  const packId = params.packId;
  if (!packId) return NextResponse.json({ error: 'packId required' }, { status: 400 });
  try {
    const tickets = await getOripaTickets(packId);
    return NextResponse.json({ data: tickets });
  } catch (err) {
    console.error('[api.oripa.tickets]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

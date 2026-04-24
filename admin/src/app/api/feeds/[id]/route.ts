import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  try {
    await prisma.feed.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // P2025 = record not found
    const notFound = typeof msg === 'string' && msg.includes('P2025');
    return NextResponse.json(
      { error: notFound ? 'not found' : msg },
      { status: notFound ? 404 : 500 },
    );
  }
}

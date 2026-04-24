import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { defaultNameFor } from '@/lib/defaultName';
import { pullOripaTickets } from '@/lib/oripa';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { packId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const packId = params.packId;
  if (!packId) return NextResponse.json({ error: 'packId required' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const indices = Array.isArray((body as { indices?: unknown[] })?.indices)
    ? ((body as { indices: unknown[] }).indices.map(Number).filter((n) => Number.isInteger(n)) as number[])
    : [];
  if (indices.length === 0) {
    return NextResponse.json({ error: 'indices required' }, { status: 400 });
  }
  if (indices.length > 10) {
    return NextResponse.json({ error: 'too many indices (max 10)' }, { status: 400 });
  }

  // 사용자 row 확보 (FK 안전)
  await prisma.user.upsert({
    where: { id: session.user.id },
    update: {},
    create: { id: session.user.id, name: defaultNameFor(session.user.id) },
  });

  try {
    const outcome = await pullOripaTickets(packId, indices, {
      id: session.user.id,
      name: session.user.name ?? defaultNameFor(session.user.id),
    });
    return NextResponse.json(outcome);
  } catch (err) {
    console.error('[api.oripa.pull]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePrizes } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!/^[a-z0-9-]+$/i.test(id)) {
    return NextResponse.json({ error: 'id 는 영문/숫자/하이픈만' }, { status: 400 });
  }

  try {
    const prizes = validatePrizes(body.prizes);
    const pack = await prisma.oripaPack.create({
      data: {
        id,
        tier: String(body.tier ?? 'normal'),
        emoji: String(body.emoji ?? '🎁'),
        name: String(body.name ?? ''),
        desc: String(body.desc ?? ''),
        price: Math.max(0, Number(body.price) || 0),
        ticketsCount: Math.max(1, Number(body.ticketsCount) || 100),
        prizes: prizes as unknown as object,
        active: body.active !== false,
      },
    });
    return NextResponse.json({ data: pack });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: '이미 존재하는 ID 입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

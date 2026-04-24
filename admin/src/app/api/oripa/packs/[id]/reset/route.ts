import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PACK_DEFS } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const def = DEFAULT_PACK_DEFS.find((d) => d.id === params.id);
  if (!def) {
    return NextResponse.json({ error: '기본 정의가 없는 팩입니다.' }, { status: 400 });
  }
  try {
    const pack = await prisma.oripaPack.upsert({
      where: { id: def.id },
      update: {
        tier: def.tier, emoji: def.emoji, name: def.name, desc: def.desc,
        price: def.price, ticketsCount: def.ticketsCount,
        prizes: def.prizes as unknown as object, active: true,
      },
      create: { ...def, prizes: def.prizes as unknown as object },
    });
    return NextResponse.json({ data: pack });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

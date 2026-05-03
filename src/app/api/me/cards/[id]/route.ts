import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** DELETE /api/me/cards/:id — 본인 카드만 삭제 가능 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  // 소유권 검증 — 다른 사용자 카드 삭제 차단
  const row = await prisma.userCard.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await prisma.userCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

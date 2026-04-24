import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const raw = (body as { name?: unknown })?.name;
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length < 2 || name.length > 20) {
    return NextResponse.json({ error: '닉네임은 2~20자' }, { status: 400 });
  }
  // 기본 sanitize — 공백만 / 이상문자 제거
  if (!/^[\p{L}\p{N}_\s.·-]+$/u.test(name)) {
    return NextResponse.json({ error: '사용할 수 없는 문자가 포함됨' }, { status: 400 });
  }

  try {
    // 유저 row 가 아직 없을 수 있음 (OAuth 첫 로그인 직후) — upsert 로 안전 처리
    const user = await prisma.user.upsert({
      where: { id: session.user.id },
      update: { name },
      create: { id: session.user.id, name },
      select: { id: true, name: true },
    });
    return NextResponse.json({ data: user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api.me.name]', msg);
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: '서버 오류: ' + msg }, { status: 500 });
  }
}

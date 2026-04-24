import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 페이지뷰 기록 — 클라이언트 navigator.sendBeacon 이 path 를 보내면 저장.
 * fire-and-forget: 응답은 간단히 204, 실패해도 사용자 플로우에 영향 없음.
 */
export async function POST(req: NextRequest) {
  let body: { path?: string; referer?: string } = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    // sendBeacon 은 content-type 을 text/plain 으로 보낼 수 있어 json parse 실패 허용
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : null;
  if (!path) return new NextResponse(null, { status: 204 });

  // IP: Vercel 은 x-forwarded-for 첫번째 값이 클라이언트 IP
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = (fwd.split(',')[0] ?? '').trim().slice(0, 64) || null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 256) || null;
  const country = req.headers.get('x-vercel-ip-country') ?? null;
  const referer = body.referer?.slice(0, 500) ?? null;

  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id ?? null;
  } catch {
    // ignore
  }

  // 오늘 00:00:00 UTC — (ip, day) 유니크 키 매칭용
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  // createMany skipDuplicates 로 유니크 충돌 무시 → 같은 IP 가 하루 여러 번 와도 1 row
  prisma.pageView.createMany({
    data: [{ path, ip, ua, userId, country, referer, day }],
    skipDuplicates: true,
  }).catch((err) => {
    console.error('[pageview]', err);
  });

  return new NextResponse(null, { status: 204 });
}

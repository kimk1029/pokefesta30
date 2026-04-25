import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_NETWORKS = new Set(['adsense', 'adfit', 'house', 'offerwall']);

/**
 * 광고 노출(impression) 비콘.
 * AdSenseSlot/AdFitSlot 마운트 시 fire-and-forget 으로 호출.
 * 클릭/수익은 광고사 iframe 내부에서 발생해 측정 불가 — 노출만 기록.
 *
 * Body: { network: 'adsense'|'adfit'|..., slotId: string }
 */
export async function POST(req: NextRequest) {
  let body: { network?: string; slotId?: string } = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    /* sendBeacon text/plain 허용 */
  }

  const network =
    typeof body.network === 'string' && ALLOWED_NETWORKS.has(body.network)
      ? body.network
      : null;
  const slotId = typeof body.slotId === 'string' ? body.slotId.slice(0, 64) : null;
  if (!network || !slotId) return new NextResponse(null, { status: 204 });

  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = (fwd.split(',')[0] ?? '').trim().slice(0, 64) || null;
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 256) || null;

  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id ?? null;
  } catch {
    /* ignore */
  }

  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  prisma.adEvent
    .create({
      data: { kind: 'impression', network, slotId, userId, ip, ua, day },
    })
    .catch((err) => console.error('[ad-event]', err));

  return new NextResponse(null, { status: 204 });
}

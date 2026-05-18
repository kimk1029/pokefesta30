import { NextResponse, type NextRequest } from 'next/server';
import { buyAvatar, buyBackground, buyFrame, pickAvatar, pickBackground, pickFrame } from '@/app/inventory-actions';

export const dynamic = 'force-dynamic';

type Body = {
  action: 'buy' | 'pick';
  kind: 'avatar' | 'bg' | 'frame';
  id: string;
  /** buy 시 가격 (서버측 검증). pick 은 무시. */
  price?: number;
};

/**
 * POST /api/me/inventory/buy
 * body: { action, kind, id, price? }
 * 응답: { ok: true, inv } 또는 { ok: false, error }
 *
 * 모바일 클라이언트가 server action 을 직접 호출할 수 없어 같은 로직을
 * REST 로 노출. 권한 검증은 각 action 내부에서 세션으로 처리됨.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const { action, kind, id, price } = body;
  if (!action || !kind || !id) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  if (action === 'pick') {
    const r =
      kind === 'avatar' ? await pickAvatar(id)
      : kind === 'bg' ? await pickBackground(id)
      : kind === 'frame' ? await pickFrame(id)
      : { ok: false as const, error: 'invalid kind' };
    return NextResponse.json(r);
  }

  if (action === 'buy') {
    const p = Number(price ?? 0);
    const r =
      kind === 'avatar' ? await buyAvatar(id, p)
      : kind === 'bg' ? await buyBackground(id, p)
      : kind === 'frame' ? await buyFrame(id, p)
      : { ok: false as const, error: 'invalid kind' };
    return NextResponse.json(r);
  }

  return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
}

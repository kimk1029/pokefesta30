import { NextResponse } from 'next/server';
import { fetchSnkrdunkApparelSnapshot } from '@/lib/snkrdunk';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) {
    return NextResponse.json({ error: 'invalid apparel id' }, { status: 400 });
  }

  try {
    const data = await fetchSnkrdunkApparelSnapshot(apparelId);
    if (!data) {
      return NextResponse.json({ data: null, reason: 'SNKRDUNK 상품 정보를 가져오지 못했습니다.' }, { status: 502 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[snkrdunk] route failed', err);
    return NextResponse.json({ data: null, reason: 'SNKRDUNK 요청 중 오류가 발생했습니다.' }, { status: 502 });
  }
}

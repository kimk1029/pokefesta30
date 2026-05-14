import { NextResponse } from 'next/server';
import { fetchSnkrdunkSalesHistory } from '@/lib/snkrdunk';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) {
    return NextResponse.json({ error: 'invalid apparel id' }, { status: 400 });
  }

  const data = await fetchSnkrdunkSalesHistory(apparelId);
  if (!data) {
    return NextResponse.json(
      { data: null, reason: 'SNKRDUNK 거래 이력을 가져오지 못했습니다.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ data });
}

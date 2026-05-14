import { NextResponse } from 'next/server';
import { fetchSnkrdunkSalesChart } from '@/lib/snkrdunk';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) {
    return NextResponse.json({ error: 'invalid apparel id' }, { status: 400 });
  }

  const data = await fetchSnkrdunkSalesChart(apparelId);
  if (!data) {
    return NextResponse.json(
      { data: null, reason: 'SNKRDUNK 시세 차트를 가져오지 못했습니다.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ data });
}

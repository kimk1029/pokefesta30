import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 광고 노출(impression) 비콘.
 * 광고 기능 중단 중이라 기록하지 않는다.
 */
export async function POST(req: NextRequest) {
  await req.text().catch(() => '');
  return new NextResponse(null, { status: 204 });
}

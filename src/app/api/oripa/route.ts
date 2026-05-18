import { NextResponse } from 'next/server';
import { getActiveOripaBoxes } from '@/lib/oripa';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

/** GET /api/oripa — 활성 오리파 박스 목록. */
export async function GET() {
  const boxes = await getActiveOripaBoxes();
  return NextResponse.json({ data: boxes });
}

import { NextResponse, type NextRequest } from 'next/server';
import { getPackWithHits } from '@/lib/cardPackHits';

export const revalidate = 900;

/**
 * GET /api/card-packs/[code]?limit=600
 * 응답: { data: PackWithHits } 또는 404
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get('limit') ?? 600);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 600) : 600;

  const pack = await getPackWithHits(code, limit);
  if (!pack) return NextResponse.json({ error: 'pack not found' }, { status: 404 });
  return NextResponse.json({ data: pack });
}

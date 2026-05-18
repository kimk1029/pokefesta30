import { NextResponse, type NextRequest } from 'next/server';
import { CARD_PACKS } from '@/lib/cardPacks';
import { getAllPacksWithHits } from '@/lib/cardPackHits';

// 팩 자체는 자주 안 변하지만 hits 안의 가격이 변하니 15분 캐시.
export const revalidate = 900;

/**
 * GET /api/card-packs
 *   - 기본: 메타데이터만 (가벼움)
 *   - ?withHits=1&limit=12 : 팩별 힛카드 그리드까지 채워서 반환 (snkrdunk 호출 다수)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const withHits = searchParams.get('withHits') === '1';
  const limitRaw = Number(searchParams.get('limit') ?? 12);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12;

  if (!withHits) {
    return NextResponse.json({ data: CARD_PACKS.map(({ hits: _, searchQuery: __, ...meta }) => meta) });
  }
  const data = await getAllPacksWithHits(limit);
  return NextResponse.json({ data });
}

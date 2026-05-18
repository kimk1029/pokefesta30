import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getMyCardsWithPrices } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** GET /api/me/cards/with-prices — 내 카드 + 최근 시세. 모바일 컬렉션 뷰용 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await getMyCardsWithPrices(session.user.id, 200);
  return NextResponse.json({ data });
}

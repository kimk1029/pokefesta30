import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getMyBookmarks } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** GET /api/me/bookmarks — 내가 찜한 거래글 + 피드 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await getMyBookmarks(session.user.id);
  return NextResponse.json({ data });
}

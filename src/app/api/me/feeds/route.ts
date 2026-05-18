import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getMyFeeds } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** GET /api/me/feeds — 내가 작성한 피드 글 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await getMyFeeds(session.user.id);
  return NextResponse.json({ data });
}

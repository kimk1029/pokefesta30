import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getConversation, markThreadRead } from '@/lib/messages';

export const dynamic = 'force-dynamic';

/** GET /api/messages/:peerId — 특정 상대와의 대화 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { peerId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const myId = session.user.id;
  const peerId = params.peerId;
  const msgs = await getConversation(myId, peerId);
  await markThreadRead(myId, peerId);
  return NextResponse.json({ data: msgs });
}

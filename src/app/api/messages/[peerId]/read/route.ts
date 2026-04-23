import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { markThreadRead } from '@/lib/messages';

export const dynamic = 'force-dynamic';

/** POST /api/messages/:peerId/read — 해당 상대와의 안 읽은 메시지를 읽음 처리 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { peerId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await markThreadRead(session.user.id, params.peerId);
  return new NextResponse(null, { status: 204 });
}

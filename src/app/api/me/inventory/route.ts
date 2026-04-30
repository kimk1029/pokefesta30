import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { runDailyCheckIn } from '@/lib/checkIn';
import { getMyInventory } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const checkIn = await runDailyCheckIn(session.user.id).catch(() => null);
  const inventory = await getMyInventory(session.user.id);
  return NextResponse.json({ inventory, checkIn });
}

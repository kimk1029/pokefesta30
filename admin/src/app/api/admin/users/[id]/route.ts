import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function one<T>(p: Promise<T>, fb: T): Promise<T> {
  try { return await p; } catch (e) { console.error('[admin.user.api]', e); return fb; }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, avatar: true, avatarId: true, backgroundId: true, frameId: true,
      rating: true, points: true,
      ownedAvatars: true, ownedBackgrounds: true, ownedFrames: true,
      createdAt: true, updatedAt: true,
      _count: {
        select: {
          feeds: true, trades: true, bookmarks: true,
          sentMessages: true, receivedMessages: true, oripaTickets: true,
        },
      },
    },
  }).catch(() => null);
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [feeds, trades, pulls, lastViews] = await Promise.all([
    one(prisma.feed.findMany({
      where: { authorId: id }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, kind: true, text: true, createdAt: true },
    }), [] as Array<{ id: number; kind: string; text: string; createdAt: Date }>),
    one(prisma.trade.findMany({
      where: { authorId: id }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, type: true, status: true, title: true, price: true, createdAt: true },
    }), [] as Array<{ id: number; type: string; status: string; title: string; price: string | null; createdAt: Date }>),
    one(prisma.oripaTicket.findMany({
      where: { drawnById: id }, orderBy: { drawnAt: 'desc' }, take: 10,
      select: { id: true, packId: true, index: true, grade: true, prizeName: true, drawnAt: true },
    }), [] as Array<{ id: number; packId: string; index: number; grade: string | null; prizeName: string | null; drawnAt: Date | null }>),
    one(prisma.pageView.findMany({
      where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, path: true, ip: true, country: true, createdAt: true },
    }), [] as Array<{ id: number; path: string; ip: string | null; country: string | null; createdAt: Date }>),
  ]);

  return NextResponse.json({ user, feeds, trades, pulls, lastViews });
}

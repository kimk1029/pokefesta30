import { AdminOripaTicketList } from '@/components/admin/AdminOripaTicketList';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export default async function AdminOripaTicketsPage() {
  // 첫 페이지 SSR — 이후 페이지는 클라이언트에서 fetch
  const rows = await prisma.oripaTicket.findMany({
    where: { drawn: true },
    orderBy: [{ drawnAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      packId: true,
      index: true,
      grade: true,
      prizeName: true,
      prizeEmoji: true,
      prizeImageUrl: true,
      drawnAt: true,
      drawnById: true,
      drawnByName: true,
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const packIds = Array.from(new Set(items.map((r) => r.packId)));
  const packs = packIds.length
    ? await prisma.oripaPack.findMany({
        where: { id: { in: packIds } },
        select: { id: true, name: true, emoji: true, price: true },
      })
    : [];
  const packMap = new Map(packs.map((p) => [p.id, p]));
  const totalDrawn = await prisma.oripaTicket.count({ where: { drawn: true } });

  const initialItems = items.map((r) => ({
    id: r.id,
    packId: r.packId,
    packName: packMap.get(r.packId)?.name ?? r.packId,
    packEmoji: packMap.get(r.packId)?.emoji ?? '🎁',
    packPrice: packMap.get(r.packId)?.price ?? null,
    index: r.index,
    grade: r.grade,
    prizeName: r.prizeName,
    prizeEmoji: r.prizeEmoji,
    prizeImageUrl: r.prizeImageUrl,
    drawnAt: r.drawnAt ? r.drawnAt.toISOString() : null,
    drawnById: r.drawnById,
    drawnByName: r.drawnByName,
  }));

  return (
    <>
      <StatusBar />
      <AppBar title="오리파 티켓 히스토리" showBack backHref="/admin" />
      <div style={{ height: 14 }} />
      <AdminOripaTicketList
        initialItems={initialItems}
        initialNextCursor={hasMore ? initialItems[initialItems.length - 1].id : null}
        totalDrawn={totalDrawn}
      />
      <div className="bggap" />
    </>
  );
}

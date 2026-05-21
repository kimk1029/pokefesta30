import { AdminOripaTicketList } from '@/components/admin/AdminOripaTicketList';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { serverFetch } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

interface AdminTicketRow {
  id: number;
  packId: string;
  packName: string;
  packEmoji: string;
  packPrice: number | null;
  index: number;
  grade: string;
  prizeName: string;
  prizeEmoji: string | null;
  prizeImageUrl: string | null;
  drawnAt: string | null;
  drawnById: string | null;
  drawnByName: string | null;
}

const PAGE_SIZE = 30;

export default async function AdminOripaTicketsPage() {
  const r = await serverFetch<{ items: AdminTicketRow[]; nextCursor: number | null }>(
    `/api/admin/oripa-tickets?limit=${PAGE_SIZE}`,
  );
  const initialItems = r.data?.items ?? [];
  const initialNextCursor = r.data?.nextCursor ?? null;
  const totalDrawn = initialItems.length;

  return (
    <>
      <StatusBar />
      <AppBar title="오리파 티켓 히스토리" showBack backHref="/admin" />
      <div style={{ height: 14 }} />
      <AdminOripaTicketList
        initialItems={initialItems}
        initialNextCursor={initialNextCursor}
        totalDrawn={totalDrawn}
      />
      <div className="bggap" />
    </>
  );
}

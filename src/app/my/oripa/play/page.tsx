import { OripaPlayScreen } from '@/components/screens/OripaPlayScreen';
import { serverFetch } from '@/lib/apiServer';
import type { OripaTicket } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { pack?: string; qty?: string };
}

export default async function Page({ searchParams }: Props) {
  const packId = (searchParams.pack ?? 'default').toString();
  const qtyRaw = Number(searchParams.qty ?? '1');
  const qty = Math.max(1, Math.min(10, Number.isFinite(qtyRaw) ? qtyRaw : 1));

  const r = await serverFetch<{ data: OripaTicket[] }>(
    `/api/oripa/${encodeURIComponent(packId)}/tickets`,
    { auth: false },
  );
  const initialTickets = r.data?.data ?? [];

  return (
    <OripaPlayScreen packId={packId} qty={qty} initialTickets={initialTickets} />
  );
}

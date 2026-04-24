import { OripaPlayScreen } from '@/components/screens/OripaPlayScreen';
import { getOripaTickets } from '@/lib/oripa';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { pack?: string; qty?: string };
}

export default async function Page({ searchParams }: Props) {
  const packId = (searchParams.pack ?? 'default').toString();
  const qtyRaw = Number(searchParams.qty ?? '1');
  const qty = Math.max(1, Math.min(10, Number.isFinite(qtyRaw) ? qtyRaw : 1));

  // 서버에서 첫 페인트용 티켓 데이터 확보 (DB 실패 시 빈 배열 → 클라이언트가 재시도)
  let initialTickets = await getOripaTickets(packId).catch((err) => {
    console.error('[oripa.play.page] getOripaTickets failed', err);
    return [];
  });

  return (
    <OripaPlayScreen packId={packId} qty={qty} initialTickets={initialTickets} />
  );
}

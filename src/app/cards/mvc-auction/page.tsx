import { StatusBar } from '@/components/ui/StatusBar';
import { MvcAuctionList } from '@/components/MvcAuctionList';
import { fetchAllTodayAuctions } from '@/lib/navercafe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MVC 경매 | 포케30',
};

export default async function Page() {
  // 오늘 마감 경매가 카페 목록 여러 페이지에 흩어져 있어 1페이지만 보면 일부 누락 →
  // 전부 모아 첫 화면부터 스크롤 없이 노출.
  const initial = await fetchAllTodayAuctions();

  return (
    <>
      <StatusBar />
      <MvcAuctionList initial={initial} />
    </>
  );
}

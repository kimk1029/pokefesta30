import Link from 'next/link';
import { CongCompact } from '@/components/CongCompact';
import { FeedChart } from '@/components/FeedChart';
import { HeroSlider } from '@/components/HeroSlider';
import { QuickGrid } from '@/components/QuickGrid';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { Place, Trade } from '@/lib/types';

interface Props {
  places: Place[];
  trades: Trade[];
  todayCount: number;
}

export function HomeScreen({ places, trades, todayCount }: Props) {
  const recentTrades = trades.slice(0, 2);

  return (
    <>
      <StatusBar />
      <AppBar
        right={
          <Link href="/my" className="appbar-right" aria-label="마이페이지">
            👤
          </Link>
        }
      />
      <HeroSlider />
      <QuickGrid />

      <div className="sect">
        <SectionTitle title="장소 혼잡도" right={<LivePill />} />
        <CongCompact places={places} />
      </div>

      <div className="sect">
        <SectionTitle
          title="시간대별 제보량"
          right={<span className="more">오늘 {todayCount}건</span>}
        />
        <FeedChart />
      </div>

      <div className="sect">
        <SectionTitle
          title="최근 거래글"
          right={
            <Link href="/trade" className="more">
              전체 ▶
            </Link>
          }
        />
        {recentTrades.length === 0 ? (
          <div className="trade-card">
            <div className="trade-title">아직 거래글이 없어요</div>
          </div>
        ) : (
          recentTrades.map((t) => <TradeCard key={t.id} trade={t} />)
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

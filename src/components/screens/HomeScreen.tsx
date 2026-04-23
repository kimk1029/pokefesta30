import Link from 'next/link';
import { CongCompact } from '@/components/CongCompact';
import { FeedChart } from '@/components/FeedChart';
import { FeedRow } from '@/components/FeedRow';
import { HeroSlider } from '@/components/HeroSlider';
import { QuickGrid } from '@/components/QuickGrid';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost, Place } from '@/lib/types';

interface Props {
  places: Place[];
  feeds: FeedPost[];
  todayCount: number;
}

export function HomeScreen({ places, feeds, todayCount }: Props) {
  const recentFeeds = feeds.slice(0, 5);

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
          title="실시간 피드"
          right={
            <Link href="/feed" className="more">
              전체 ▶
            </Link>
          }
        />
        {recentFeeds.length === 0 ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 피드가 없어요</div>
            </div>
          </div>
        ) : (
          recentFeeds.map((p) => <FeedRow key={p.id} post={p} />)
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

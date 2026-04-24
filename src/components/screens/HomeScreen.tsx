import Link from 'next/link';
import { AppBarProfile } from '@/components/AppBarProfile';
import { FeedRow } from '@/components/FeedRow';
import { HeroSlider } from '@/components/HeroSlider';
import { HomeInfoTabs } from '@/components/HomeInfoTabs';
import { QuickGrid } from '@/components/QuickGrid';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost, Place } from '@/lib/types';

interface Props {
  places: Place[];
  feeds: FeedPost[];
  todayCount: number;
  hourlyCounts: number[];
  nowHour: number;
}

export function HomeScreen({ places, feeds, todayCount, hourlyCounts, nowHour }: Props) {
  const recentFeeds = feeds.slice(0, 5);

  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />
      <HeroSlider />
      <QuickGrid />

      <HomeInfoTabs places={places} todayCount={todayCount} hourlyCounts={hourlyCounts} nowHour={nowHour} />

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

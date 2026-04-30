import Link from 'next/link';
import { AppBarProfile } from '@/components/AppBarProfile';
import { FeedAdRow } from '@/components/FeedAdRow';
import { FeedRow } from '@/components/FeedRow';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
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
  heroBanners?: HeroSlideData[];
}

export function HomeScreen({ places, feeds, todayCount, hourlyCounts, nowHour, heroBanners }: Props) {
  const recentFeeds = feeds.slice(0, 5);

  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />
      <HeroSlider slides={heroBanners} />
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
          recentFeeds.flatMap((p, i) => {
            const row = <FeedRow key={p.id} post={p} />;
            // 4번째 피드 다음 1개 광고 (피드가 5개 이상일 때만 — 4번째가 마지막이면 광고 생략)
            if (i === 3 && recentFeeds.length >= 5) {
              return [row, <FeedAdRow key="home-ad" slotIndex={0} />];
            }
            return [row];
          })
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

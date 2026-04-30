import { AppBarProfile } from '@/components/AppBarProfile';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import { HomeInfoTabs } from '@/components/HomeInfoTabs';
import { HomeRecentFeed } from '@/components/HomeRecentFeed';
import { QuickGrid } from '@/components/QuickGrid';
import { AppBar } from '@/components/ui/AppBar';
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
  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />
      <HeroSlider slides={heroBanners} />
      <QuickGrid />

      <HomeInfoTabs places={places} todayCount={todayCount} hourlyCounts={hourlyCounts} nowHour={nowHour} />

      <HomeRecentFeed initialFeeds={feeds.slice(0, 5)} />

      <div className="bggap" />
    </>
  );
}

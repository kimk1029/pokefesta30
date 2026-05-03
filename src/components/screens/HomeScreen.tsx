import { AppBarProfile } from '@/components/AppBarProfile';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import { HomeRecentFeed } from '@/components/HomeRecentFeed';
import { MyCardsPreview } from '@/components/MyCardsPreview';
import { QuickGrid } from '@/components/QuickGrid';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import type { MyCardRow } from '@/lib/queries';
import type { FeedPost } from '@/lib/types';

interface Props {
  feeds: FeedPost[];
  heroBanners?: HeroSlideData[];
  myCards: MyCardRow[];
  myCardsTotal: number;
  isLoggedIn: boolean;
}

export function HomeScreen({
  feeds,
  heroBanners,
  myCards,
  myCardsTotal,
  isLoggedIn,
}: Props) {
  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />
      <HeroSlider slides={heroBanners} />
      <QuickGrid />

      {isLoggedIn && <MyCardsPreview cards={myCards} total={myCardsTotal} />}

      <HomeRecentFeed initialFeeds={feeds.slice(0, 5)} />

      <div className="bggap" />
    </>
  );
}

'use client';

import { useState } from 'react';
import { CongCompact } from './CongCompact';
import { FeedChart } from './FeedChart';
import { LivePill } from './ui/LivePill';
import { SectionTitle } from './ui/SectionTitle';
import { Segmented } from './ui/Segmented';
import type { Place } from '@/lib/types';

type Tab = 'cong' | 'chart';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'cong',  label: '📍 장소 혼잡도' },
  { id: 'chart', label: '📊 시간대별 제보량' },
];

interface Props {
  places: Place[];
  todayCount: number;
  hourlyCounts: number[];
  nowHour: number;
}

export function HomeInfoTabs({ places, todayCount, hourlyCounts, nowHour }: Props) {
  const [tab, setTab] = useState<Tab>('cong');

  return (
    <>
      <Segmented items={TABS} value={tab} onChange={setTab} />

      {tab === 'cong' ? (
        <div className="sect">
          <SectionTitle title="장소 혼잡도" right={<LivePill />} />
          <CongCompact places={places} />
        </div>
      ) : (
        <div className="sect">
          <SectionTitle
            title="시간대별 제보량"
            right={<span className="more">오늘 {todayCount}건</span>}
          />
          <FeedChart counts={hourlyCounts} nowHour={nowHour} />
        </div>
      )}
    </>
  );
}

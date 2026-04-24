'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CongCompact } from '@/components/CongCompact';
import { FeedChart } from '@/components/FeedChart';
import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost, Place } from '@/lib/types';

type Tab = 'cong' | 'chart';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'cong',  label: '📍 장소 혼잡도' },
  { id: 'chart', label: '📊 시간대별 제보량' },
];

interface Props {
  places: Place[];
  initialFeeds: FeedPost[];
  initialCursor: string | null;
  todayCount: number;
  hourlyCounts: number[];
  nowHour: number;
}

export function LiveScreen({ places, initialFeeds, initialCursor, todayCount, hourlyCounts, nowHour }: Props) {
  const [tab, setTab] = useState<Tab>('cong');

  const [posts, setPosts] = useState<FeedPost[]>(initialFeeds);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ cursor, limit: '15' });
      const r = await fetch(`/api/feeds?${qs.toString()}`, { cache: 'no-store' });
      const data: { items: FeedPost[]; nextCursor: string | null } = await r.json();
      setPosts((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  return (
    <>
      <StatusBar />
      <AppBar title="실시간 현황" right={<LivePill />} />

      <div style={{ height: 14 }} />

      <Segmented items={TABS} value={tab} onChange={setTab} />

      {tab === 'cong' ? (
        <div className="sect">
          <SectionTitle
            title="장소별 혼잡도"
            right={<span className="more">{places.length}곳</span>}
          />
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

      <div className="sect">
        <SectionTitle
          title="실시간 피드"
          right={
            <Link href="/feed" className="more">
              전체 ▶
            </Link>
          }
        />
        {posts.length === 0 ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 피드가 없어요</div>
            </div>
          </div>
        ) : (
          posts.map((p) => <FeedRow key={`${p.kind}-${p.id}`} post={p} />)
        )}
        {cursor && (
          <div
            ref={sentinelRef}
            style={{
              padding: '18px 0',
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              color: 'var(--ink3)',
              letterSpacing: 1,
            }}
          >
            {loading ? '불러오는 중...' : '↓ 스크롤하면 더 보기'}
          </div>
        )}
      </div>

      <div className="bggap" />

      <Link href="/write/feed?kind=report" className="fab-btn">
        + 제보하기
      </Link>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FeedAdRow } from './FeedAdRow';
import { FeedRow } from './FeedRow';
import { SectionTitle } from './ui/SectionTitle';
import type { FeedPost } from '@/lib/types';

interface Props {
  initialFeeds: FeedPost[];
}

/**
 * 홈 "실시간 피드" 섹션 — 클라이언트 컴포넌트.
 * 제목 옆 🔄 버튼으로 이 섹션만 다시 fetch (페이지 전체 reload 아님).
 */
export function HomeRecentFeed({ initialFeeds }: Props) {
  const [feeds, setFeeds] = useState<FeedPost[]>(initialFeeds);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setErr(null);
    try {
      const r = await fetch('/api/feeds?limit=5', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items: FeedPost[] };
      setFeeds(data.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '새로고침 실패');
      setTimeout(() => setErr(null), 2200);
    } finally {
      setRefreshing(false);
    }
  };

  const recentFeeds = feeds.slice(0, 5);

  return (
    <div className="sect">
      <SectionTitle
        title="실시간 피드"
        right={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              aria-label="피드 새로고침"
              title={refreshing ? '새로고침 중…' : '최신 피드 가져오기'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: refreshing ? 'default' : 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: 4,
                color: 'var(--ink2)',
                display: 'inline-block',
                animation: refreshing ? 'pf-ball-spin 0.8s linear infinite' : undefined,
              }}
            >
              🔄
            </button>
            <Link href="/feed" className="more">
              전체 ▶
            </Link>
          </span>
        }
      />

      {err && (
        <div
          style={{
            margin: '0 var(--gap) 8px',
            padding: '6px 10px',
            background: 'var(--red)',
            color: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          ⚠ {err}
        </div>
      )}

      {recentFeeds.length === 0 ? (
        <div className="feed-item">
          <div className="fi-body">
            <div className="fi-text">아직 피드가 없어요</div>
          </div>
        </div>
      ) : (
        recentFeeds.flatMap((p, i) => {
          const row = <FeedRow key={p.id} post={p} />;
          // 4번째 피드 다음 1개 광고 (피드가 5개 이상일 때만)
          if (i === 3 && recentFeeds.length >= 5) {
            return [row, <FeedAdRow key="home-ad" slotIndex={0} />];
          }
          return [row];
        })
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedAdRow } from '@/components/FeedAdRow';
import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { Segmented } from '@/components/ui/Segmented';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedKind, FeedPost } from '@/lib/types';

type Filter = 'all' | FeedKind;

/** 광고 노출 정책 — 자연스러운 인벤토리 밀도 */
const AD_FIRST_AT = 4;   // 처음 4개 글까지는 광고 없음 (이탈 방지)
const AD_INTERVAL = 8;   // 이후 8개마다 1개

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'general', label: '일반' },
  { id: 'report', label: '제보' },
];

interface Props {
  initialPosts: FeedPost[];
  initialCursor: string | null;
}

export function FeedScreen({ initialPosts, initialCursor }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /** 필터 변경 시 초기 페이지 다시 fetch */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (filter !== 'all') qs.set('kind', filter);
    qs.set('limit', '20');
    fetch(`/api/feeds?${qs.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { items: FeedPost[]; nextCursor: string | null }) => {
        if (cancelled) return;
        setPosts(data.items);
        setCursor(data.nextCursor);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  /** 다음 페이지 로드 */
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter !== 'all') qs.set('kind', filter);
      qs.set('cursor', cursor);
      qs.set('limit', '20');
      const r = await fetch(`/api/feeds?${qs.toString()}`, { cache: 'no-store' });
      const data: { items: FeedPost[]; nextCursor: string | null } = await r.json();
      setPosts((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [cursor, filter, loading]);

  /** IntersectionObserver 로 센티널이 보이면 다음 페이지 */
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
      <AppBar
        title="피드"
        right={
          <Link href="/write/feed" className="appbar-right" aria-label="글쓰기">
            ✏
          </Link>
        }
      />

      <div style={{ height: 14 }} />

      <Segmented items={FILTERS} value={filter} onChange={setFilter} />

      <div className="sect">
        <SectionTitle title="타임라인" right={<span className="more">최신순 · {posts.length}건</span>} />
        {posts.length === 0 && !loading ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">
                아직 글이 없어요.{' '}
                <Link href="/write/feed" style={{ textDecoration: 'underline' }}>
                  첫 번째가 되어보세요
                </Link>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            let adIndex = 0;
            return posts.flatMap((p, i) => {
              const row = <FeedRow key={`${p.kind}-${p.id}`} post={p} />;
              const pos = i + 1;
              const isAdSlot =
                pos >= AD_FIRST_AT &&
                (pos - AD_FIRST_AT) % AD_INTERVAL === 0 &&
                i !== posts.length - 1;
              if (!isAdSlot) return [row];
              const ad = <FeedAdRow key={`ad-${adIndex}`} index={adIndex} />;
              adIndex++;
              return [row, ad];
            });
          })()
        )}

        {error && (
          <div
            style={{
              padding: '12px 10px',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--red)',
              textAlign: 'center',
            }}
          >
            ⚠ {error}
          </div>
        )}

        {cursor && (
          <div
            ref={sentinelRef}
            style={{
              padding: '18px 0',
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 1,
            }}
          >
            {loading ? '불러오는 중...' : '↓ 스크롤하면 더 보기'}
          </div>
        )}
        {!cursor && posts.length > 0 && (
          <div
            style={{
              padding: '18px 0',
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 1,
            }}
          >
            · 끝 ·
          </div>
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

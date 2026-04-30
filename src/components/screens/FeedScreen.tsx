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
// AdFit 은 한 페이지에 같은 ad-unit 을 두 번 채우지 않음 (SDK 가 첫 번째만 fill,
// 두 번째 슬롯은 빈 박스로 남음). 별도 ad-unit 등록 전까지는 페이지당 1개만 노출.
const AD_MAX_PER_PAGE = 1;

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

  // 첫 마운트엔 SSR initialPosts 가 이미 있어서 fetch 생략 — filter 가 바뀔 때만 실행
  const isFirstFilterRun = useRef(true);

  /** 필터 변경 시 초기 페이지 다시 fetch — 사용자에게 "교체 중" 시각 피드백 줌 */
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPosts([]); // 즉시 비워서 스피너가 명확히 보이도록
    setCursor(null);
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
        {loading && posts.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 0.5,
            }}
            aria-live="polite"
          >
            <FeedSpinner />
            <span>불러오는 중…</span>
          </div>
        ) : posts.length === 0 ? (
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
              if (!isAdSlot || adIndex >= AD_MAX_PER_PAGE) return [row];
              const ad = <FeedAdRow key={`ad-${adIndex}`} />;
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

/** 피드 탭 전환 시 보여줄 포켓볼 스피너 (간단 버전) */
function FeedSpinner() {
  return (
    <div
      aria-hidden
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid var(--ink)',
        background:
          'linear-gradient(to bottom,var(--red) 0,var(--red) 46%,var(--ink) 46%,var(--ink) 54%,var(--white) 54%,var(--white) 100%)',
        animation: 'pf-ball-spin 0.8s linear infinite',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--white)',
          border: '2px solid var(--ink)',
          transform: 'translate(-50%,-50%)',
        }}
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedAdRow } from '@/components/FeedAdRow';
import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost } from '@/lib/types';

/** 광고 노출 정책 — 4번째 글마다 광고 1개 (전체 ∞)
 *  네트워크는 FeedAdRow 안에서 alternate (slot0=AdFit, slot1+=AdSense). */
const AD_FIRST_AT = 4;
const AD_INTERVAL = 4;

interface Props {
  initialPosts: FeedPost[];
  initialCursor: string | null;
}

export function FeedScreen({ initialPosts, initialCursor }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /** 다음 페이지 로드 */
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
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
  }, [cursor, loading]);

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

      <div className="sect">
        <SectionTitle title="커뮤니티" right={<span className="more">최신순 · {posts.length}건</span>} />
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
              const row = <FeedRow key={`feed-${p.id}`} post={p} />;
              const pos = i + 1;
              const isAdSlot =
                pos >= AD_FIRST_AT &&
                (pos - AD_FIRST_AT) % AD_INTERVAL === 0 &&
                i !== posts.length - 1;
              if (!isAdSlot) return [row];
              const ad = <FeedAdRow key={`ad-${adIndex}`} slotIndex={adIndex} />;
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

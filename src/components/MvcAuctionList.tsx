'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MvcAuctionItem, MvcAuctionTodayPage } from '@/lib/navercafe';

const MAX_PAGE = 30; // 안전 상한
const PAGES_PER_TRIGGER = 5; // 한 번 트리거에 빈 페이지를 건너뛰며 최대 탐색할 수

function AuctionRow({ item }: { item: MvcAuctionItem }) {
  return (
    <Link
      href={`/cards/mvc-auction/${item.articleId}`}
      className="shop-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="sh-icon"
        style={{
          width: 84,
          height: 84,
          background: 'var(--ink2)',
          color: 'var(--white)',
          overflow: 'hidden',
          alignSelf: 'stretch',
        }}
      >
        {item.thumbnailUrl ? (
          // 외부(네이버 카페) 이미지는 일반 <img> 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 30, display: 'grid', placeItems: 'center', height: '100%' }}>🔨</span>
        )}
      </div>
      <div className="sh-main">
        <div
          className="sh-title"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {item.subject}
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>{item.writerNickname}</span>
          <span>· {item.writtenAgo}</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            marginTop: 6,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span style={{ color: item.commentCount > 0 ? 'var(--red)' : 'var(--ink3)' }}>
            🔨 입찰 {item.commentCount}
          </span>
          <span style={{ color: 'var(--ink2)' }}>👁 {item.readCount}</span>
        </div>
      </div>
    </Link>
  );
}

interface Props {
  initial: MvcAuctionTodayPage;
}

export function MvcAuctionList({ initial }: Props) {
  const [items, setItems] = useState<MvcAuctionItem[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [done, setDone] = useState(
    !initial.hasNext || initial.reachedOld || initial.page >= MAX_PAGE,
  );
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 동시 호출 방지용 ref (state 비동기 갱신 race 회피)
  const busy = useRef(false);
  const seen = useRef<Set<number>>(new Set(initial.items.map((i) => i.articleId)));

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    let nextPage = page;
    try {
      // 오늘 마감 필터로 빈 페이지가 나올 수 있어, 항목이 추가되거나 끝날 때까지 진행.
      for (let i = 0; i < PAGES_PER_TRIGGER; i++) {
        nextPage += 1;
        const res = await fetch(`/api/navercafe/list?page=${nextPage}`);
        const data = (await res.json()) as MvcAuctionTodayPage;
        const fresh = (data.items ?? []).filter((it) => {
          if (seen.current.has(it.articleId)) return false;
          seen.current.add(it.articleId);
          return true;
        });
        if (fresh.length > 0) setItems((prev) => [...prev, ...fresh]);

        const noMore = !data.hasNext || data.reachedOld || nextPage >= MAX_PAGE;
        if (noMore) {
          setDone(true);
          break;
        }
        if (fresh.length > 0) break; // 항목을 얻었으면 이번 트리거 종료
      }
    } catch {
      // 네트워크 오류는 다음 트리거에서 재시도
    } finally {
      setPage(nextPage);
      setLoading(false);
      busy.current = false;
    }
  }, [page, done]);

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  return (
    <>
      {items.map((item) => (
        <AuctionRow key={item.articleId} item={item} />
      ))}

      {items.length === 0 && !loading && (
        <div
          style={{
            margin: '0 var(--gap)',
            padding: '40px 16px',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink3)',
          }}
        >
          오늘 마감인 경매가 없습니다.
        </div>
      )}

      {/* 무한스크롤 센티넬 + 상태 */}
      {!done && <div ref={sentinelRef} style={{ height: 1 }} />}
      <div
        style={{
          padding: '16px 0 8px',
          textAlign: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          color: 'var(--ink3)',
          letterSpacing: 0.5,
        }}
      >
        {loading ? '불러오는 중…' : done ? `오늘 마감 경매 ${items.length}건 · 끝` : ''}
      </div>
    </>
  );
}

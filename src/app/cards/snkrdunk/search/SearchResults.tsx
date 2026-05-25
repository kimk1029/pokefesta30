'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Price } from '@/components/Price';
import { searchSnkrdunkPage, type HydratedHit } from './actions';

const ACCENT = '#1B2E89';

export function SearchResults({
  ja,
  initialHits,
  initialHasMore,
}: {
  ja: string;
  initialHits: HydratedHit[];
  initialHasMore: boolean;
}) {
  const [hits, setHits] = useState<HydratedHit[]>(initialHits);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const { hits: more, hasMore: hm } = await searchSnkrdunkPage(ja, next);
      const seen = new Set(hits.map((h) => h.apparelId));
      const fresh = more.filter((h) => !seen.has(h.apparelId));
      if (fresh.length > 0) setHits((prev) => [...prev, ...fresh]);
      setPage(next);
      // 새 항목이 없으면 끝
      setHasMore(hm && fresh.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, hits, ja]);

  // 무한스크롤 — 바닥 센티넬이 보이면 자동으로 다음 페이지 로딩.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  if (hits.length === 0) {
    return (
      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: 30,
          textAlign: 'center',
          background: 'var(--white)',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          color: 'var(--ink3)',
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
        }}
      >
        검색 결과가 없습니다
      </div>
    );
  }

  return (
    <div className="sect">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 15, letterSpacing: 0.4 }}>싱글카드 시세</div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', marginTop: 4 }}>
            {hits.length}개 매물{hasMore ? '+' : ''}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {hits.map((hit) => (
          <SearchHitCard key={hit.apparelId} hit={hit} />
        ))}
      </div>

      {/* 무한스크롤 센티넬 + 상태 표시 */}
      {hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
      <div
        style={{
          marginTop: 14,
          textAlign: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          letterSpacing: 0.5,
          color: 'var(--ink3)',
        }}
      >
        {loading ? '불러오는 중…' : hasMore ? '' : `검색 결과 ${hits.length}건 · 끝`}
      </div>
    </div>
  );
}

function SearchHitCard({ hit }: { hit: HydratedHit }) {
  const koTitle = hit.koName || hit.jpName;
  const jpTitle = hit.jpName && hit.jpName !== koTitle ? hit.jpName : null;
  const hasPrice = hit.minPrice > 0;
  return (
    <Link
      href={`/cards/snkrdunk/${hit.apparelId}`}
      className="pack-grid-card"
      style={{ borderTop: `4px solid ${ACCENT}` }}
    >
      <div
        style={{
          aspectRatio: '63 / 88',
          background: 'var(--pap2)',
          overflow: 'hidden',
        }}
      >
        {hit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.imageUrl}
            alt={koTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
            <span style={{ fontSize: 37 }}>🃏</span>
          </div>
        )}
      </div>
      <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 0.2,
            marginBottom: jpTitle ? 3 : 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 30,
            lineHeight: 1.45,
            wordBreak: 'keep-all',
          }}
        >
          {koTitle}
        </div>
        {jpTitle ? (
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.5,
            }}
          >
            {jpTitle}
          </div>
        ) : null}
        <div
          style={{
            display: 'inline-block',
            padding: '3px 6px',
            background: hasPrice ? 'var(--ink)' : 'var(--pap2)',
            color: hasPrice ? 'var(--gold)' : 'var(--ink3)',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 0.3,
            boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
          }}
        >
          {hasPrice ? <Price jpy={hit.minPrice} /> : '시세 없음'}
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink3)',
            marginTop: 5,
            letterSpacing: 0.3,
            minHeight: 12,
          }}
        >
          {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
        </div>
      </div>
    </Link>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Price } from '@/components/Price';
import type { BunjangItem } from '@/lib/bunjang';
import { searchSnkrdunkPage, type HydratedHit } from './actions';

const ACCENT = '#1B2E89';

type Category = 'snkrdunk' | 'bunjang';

export function SearchResults({
  q,
  ja,
  initialHits,
  initialHasMore,
}: {
  /** 원본 한국어 검색어 — 번개장터(국내) 검색에 사용. */
  q: string;
  /** 일본어 변환 검색어 — SNKRDUNK 검색에 사용. */
  ja: string;
  initialHits: HydratedHit[];
  initialHasMore: boolean;
}) {
  const [cat, setCat] = useState<Category>('snkrdunk');

  // SNKRDUNK (무한스크롤)
  const [hits, setHits] = useState<HydratedHit[]>(initialHits);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 번개장터 (한국어 원본 검색, 탭 진입 시 지연 로딩)
  const [bj, setBj] = useState<BunjangItem[]>([]);
  const [bjLoading, setBjLoading] = useState(false);
  const [bjLoaded, setBjLoaded] = useState(false);

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
      setHasMore(hm && fresh.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, hits, ja]);

  // 무한스크롤 — SNKRDUNK 탭에서 바닥 센티넬이 보이면 다음 페이지 로딩.
  useEffect(() => {
    if (cat !== 'snkrdunk' || !hasMore) return;
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
  }, [cat, hasMore, loadMore]);

  // 번개장터 지연 로딩
  useEffect(() => {
    if (cat !== 'bunjang' || !q || bjLoaded || bjLoading) return;
    let alive = true;
    setBjLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/bunjang/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { items?: BunjangItem[] };
        if (alive) setBj(data.items ?? []);
      } catch {
        if (alive) setBj([]);
      } finally {
        if (alive) {
          setBjLoaded(true);
          setBjLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [cat, q, bjLoaded, bjLoading]);

  return (
    <div className="sect">
      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <TabButton
          label="SNKRDUNK"
          sub={hits.length > 0 ? `${hits.length}건${hasMore ? '+' : ''}` : '시세'}
          active={cat === 'snkrdunk'}
          onClick={() => setCat('snkrdunk')}
        />
        <TabButton
          label="번개장터"
          sub={bjLoaded ? `${bj.length}건` : '국내매물'}
          active={cat === 'bunjang'}
          onClick={() => setCat('bunjang')}
        />
      </div>

      {cat === 'snkrdunk' ? (
        hits.length === 0 ? (
          <EmptyBox text="SNKRDUNK 결과가 없습니다" />
        ) : (
          <>
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
            {hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
            <StatusNote text={loading ? '불러오는 중…' : hasMore ? '' : `SNKRDUNK ${hits.length}건 · 끝`} />
          </>
        )
      ) : bjLoading ? (
        <StatusNote text="불러오는 중…" />
      ) : bj.length === 0 ? (
        <EmptyBox text="번개장터 결과가 없습니다" />
      ) : (
        <>
          {bj.map((item) => (
            <BunjangCard key={item.pid} item={item} />
          ))}
          <StatusNote text={`번개장터 ${bj.length}건`} />
        </>
      )}
    </div>
  );
}

function TabButton({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'center',
        background: active ? 'var(--ink)' : 'var(--white)',
        color: active ? 'var(--gold)' : 'var(--ink)',
        fontFamily: 'var(--f1)',
        letterSpacing: 0.5,
        boxShadow: active
          ? '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 var(--ink2),5px 5px 0 var(--gold-dk)'
          : '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
      }}
    >
      <div style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 8, marginTop: 3, opacity: 0.85 }}>{sub}</div>
    </button>
  );
}

function StatusNote({ text }: { text: string }) {
  return (
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
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
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
      {text}
    </div>
  );
}

function BunjangCard({ item }: { item: BunjangItem }) {
  return (
    <Link
      href={`/cards/bunjang/${item.pid}`}
      className="shop-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="sh-icon"
        style={{ width: 84, height: 84, background: 'var(--ink2)', overflow: 'hidden', alignSelf: 'stretch' }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 28, display: 'grid', placeItems: 'center', height: '100%' }}>📦</span>
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
          {item.ad && (
            <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginRight: 4 }}>AD</span>
          )}
          {item.name}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 14, color: 'var(--red)', marginTop: 6, letterSpacing: 0.3 }}>
          {item.price > 0 ? `${item.price.toLocaleString('ko-KR')}원` : '가격문의'}
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink3)',
            marginTop: 6,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {item.location && <span>📍 {item.location}</span>}
          {item.favCount > 0 && <span>❤ {item.favCount}</span>}
        </div>
      </div>
    </Link>
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

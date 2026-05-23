'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';

interface BrowseItem {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

interface BrowseResponse {
  page: number;
  results: BrowseItem[];
}

function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 36 ? cut.slice(0, 35) + '…' : cut;
}

export default function Page() {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/snkrdunk/browse?page=${p}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as BrowseResponse;
      const fresh = json.results.filter((r) => !seenIdsRef.current.has(r.apparelId));
      fresh.forEach((r) => seenIdsRef.current.add(r.apparelId));
      if (fresh.length === 0) {
        setDone(true);
      } else {
        setItems((prev) => [...prev, ...fresh]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // IntersectionObserver 로 sentinel 가 보이면 다음 페이지 요청
  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !done) {
          const next = page + 1;
          setPage(next);
          loadPage(next);
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [page, loading, done, loadPage]);

  return (
    <>
      <StatusBar />
      <AppBar title="스니덩크 전체 시세" showBack backHref="/cards/snkrdunk" />

      <div style={{ height: 14 }} />

      <div className="sect">
        <SectionTitle
          title="전체 카드"
          right={<span className="more">{items.length}종</span>}
        />

        {items.map((it) => (
          <Link
            key={it.apparelId}
            href={`/cards/snkrdunk/${it.apparelId}`}
            className="shop-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              className="sh-icon"
              style={{
                background: 'var(--pap2)',
                color: 'var(--white)',
                overflow: 'hidden',
              }}
            >
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrl}
                  alt={it.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 23 }}>🃏</span>
              )}
            </div>
            <div className="sh-main">
              <div
                className="sh-title"
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 12,
                  letterSpacing: 0.3,
                  lineHeight: 1.4,
                }}
              >
                {shortenName(it.name)}
              </div>
              <div
                className="sh-desc"
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 12,
                  color: 'var(--red)',
                  marginTop: 6,
                  letterSpacing: 0.3,
                }}
              >
                {it.priceText || '—'}
              </div>
            </div>
          </Link>
        ))}

        <div
          ref={sentinelRef}
          style={{
            padding: '24px 0',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            letterSpacing: 0.3,
          }}
        >
          {error ? (
            <span style={{ color: 'var(--red)' }}>
              불러오기 오류: {error}
              <button
                onClick={() => loadPage(page)}
                style={{
                  marginLeft: 10,
                  fontFamily: 'var(--f1)',
                  fontSize: 10,
                  padding: '4px 10px',
                  background: 'var(--ink)',
                  color: 'var(--white)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                재시도
              </button>
            </span>
          ) : done ? (
            items.length === 0 ? '결과가 없습니다.' : '— 끝 —'
          ) : loading ? (
            '불러오는 중…'
          ) : (
            '아래로 스크롤'
          )}
        </div>
      </div>

      <div style={{ height: 80 }} />
    </>
  );
}

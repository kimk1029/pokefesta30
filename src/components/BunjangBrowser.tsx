'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { BunjangItem } from '@/lib/bunjang';

function bunjangSearchUrl(query: string): string {
  return `https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(query)}`;
}

function fmtWon(n: number): string {
  if (!n || n <= 0) return '가격문의';
  return `${n.toLocaleString('ko-KR')}원`;
}

function fmtAgo(ms: number): string {
  if (!ms) return '';
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

function ItemRow({ item }: { item: BunjangItem }) {
  return (
    <Link
      href={`/cards/bunjang/${item.pid}`}
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
        {item.imageUrl ? (
          // 외부(번개장터) 이미지는 일반 <img> 사용
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
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 14,
            color: 'var(--red)',
            marginTop: 6,
            letterSpacing: 0.3,
          }}
        >
          {fmtWon(item.price)}
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
          {item.updatedAt > 0 && <span>{fmtAgo(item.updatedAt)}</span>}
        </div>
      </div>
    </Link>
  );
}

interface Props {
  initialItems: BunjangItem[];
  initialQuery: string;
}

export function BunjangBrowser({ initialItems, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [items, setItems] = useState<BunjangItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setActiveQuery(trimmed);
    try {
      const res = await fetch(`/api/bunjang/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as { items: BunjangItem[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 검색바 */}
      <div style={{ margin: '0 var(--gap) var(--cg)', display: 'flex', gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(query);
          }}
          placeholder="번개장터 검색 (예: 리자몽 SAR)"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '11px 12px',
            fontSize: 14,
            border: '2px solid var(--ink)',
            background: 'var(--white)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => submit(query)}
          style={{
            padding: '0 16px',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 0.5,
            background: 'var(--red)',
            color: 'var(--white)',
            border: 'none',
            cursor: 'pointer',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          }}
        >
          검색
        </button>
      </div>

      {/* 번개장터 앱/웹에서 직접 검색 */}
      <div style={{ margin: '0 var(--gap) var(--cg)' }}>
        <a
          href={bunjangSearchUrl(activeQuery || '포켓몬카드')}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '9px',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.5,
            background: 'var(--pap2)',
            color: 'var(--ink)',
            textDecoration: 'none',
            boxShadow: 'inset 0 0 0 2px var(--line)',
          }}
        >
          번개장터에서 “{activeQuery || '포켓몬카드'}” 직접 검색 →
        </a>
      </div>

      {/* 결과 */}
      <div className="sect">
        <div className="sect-title">
          <h2 style={{ margin: 0 }}>“{activeQuery}” 매물 {items.length}건</h2>
        </div>
        {loading ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              color: 'var(--ink3)',
            }}
          >
            불러오는 중…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              color: 'var(--ink3)',
            }}
          >
            매물이 없습니다.
          </div>
        ) : (
          items.map((item) => <ItemRow key={item.pid} item={item} />)
        )}
      </div>
    </>
  );
}

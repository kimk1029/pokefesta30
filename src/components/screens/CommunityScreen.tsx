'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedPost, Trade } from '@/lib/types';

type Tab = 'feed' | 'market';
type MktTab = 'all' | 'sell' | 'buy';

interface Props {
  initialFeed: FeedPost[];
  trades: Trade[];
}

export function CommunityScreen({ initialFeed, trades }: Props) {
  const [tab, setTab] = useState<Tab>('feed');
  const [mktTab, setMktTab] = useState<MktTab>('all');

  const mktList = trades.filter((t) => mktTab === 'all' || t.type === mktTab);

  return (
    <>
      <StatusBar />
      <AppBar
        title="커뮤니티"
        right={
          <Link
            href={tab === 'feed' ? '/write/feed' : '/write/trade'}
            className="appbar-right"
            aria-label="글쓰기"
          >
            ✏
          </Link>
        }
      />
      <div style={{ height: 12 }} />

      {/* Main subtabs */}
      <div className="cv-subseg">
        <button type="button" className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          🗣 피드
        </button>
        <button type="button" className={tab === 'market' ? 'on' : ''} onClick={() => setTab('market')}>
          🏷 마켓
        </button>
      </div>

      {tab === 'feed' && <FeedList posts={initialFeed} />}

      {tab === 'market' && (
        <>
          <div className="cv-subseg" style={{ marginTop: 4 }}>
            {(
              [
                ['all', '전체'],
                ['sell', '팝니다'],
                ['buy', '삽니다'],
              ] as Array<[MktTab, string]>
            ).map(([id, lb]) => (
              <button
                key={id}
                type="button"
                className={mktTab === id ? 'on' : ''}
                onClick={() => setMktTab(id)}
              >
                {lb}
              </button>
            ))}
          </div>
          <MarketList list={mktList} />
        </>
      )}

      <div className="bggap" />
    </>
  );
}

/* ---------------- feed ---------------- */

function FeedList({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="cv-empty">
        아직 글이 없어요.
        <br />
        <Link href="/write/feed" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
          ＋ 첫 번째가 되어보세요
        </Link>
      </div>
    );
  }
  return (
    <div className="sect">
      {posts.map((p) => (
        <FeedRow key={`feed-${p.id}`} post={p} />
      ))}
    </div>
  );
}

/* ---------------- market ---------------- */

function MarketList({ list }: { list: Trade[] }) {
  if (list.length === 0) {
    return (
      <div className="cv-empty">
        해당 카테고리 거래글이 없어요.
        <br />
        <Link href="/write/trade" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
          ＋ 거래글 작성
        </Link>
      </div>
    );
  }
  return (
    <div className="cv-sect">
      {list.map((t) => (
        <Link
          key={t.id}
          href={`/trade/${t.id}`}
          className="cv-list-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            className="cv-list-thumb cv-card-img"
            style={{ background: 'linear-gradient(160deg,#3A5BD933,var(--ink2))' }}
          >
            {t.images && t.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.images[0]}
                alt={t.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
              />
            ) : (
              <div className="cv-card-em" style={{ fontSize: 24 }}>
                {t.type === 'sell' ? '🏷' : '🛒'}
              </div>
            )}
          </div>
          <div className="cv-lc-body">
            <div className="cv-lc-title">{t.title}</div>
            <div className="cv-lc-sub">
              {t.place ? `📍 ${t.place}` : ''} · {t.time}
            </div>
            <div className="cv-lc-row">
              <span className={`cv-tag cv-tag-${t.type}`}>
                {t.type === 'sell' ? '팝니다' : '삽니다'}
              </span>
              {typeof t.bumpCount === 'number' && t.bumpCount > 0 && (
                <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)' }}>
                  ↑ {t.bumpCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--grn-dk)', letterSpacing: 0.5 }}>
                {t.price}
              </span>
              <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)' }}>
                {t.authorName ?? '익명'}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { IconButton } from '@/components/ui/IconButton';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBar } from '@/components/ui/StatusBar';
import type { Trade, TradeType } from '@/lib/types';

type Filter = 'all' | TradeType;

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'buy', label: '삽니다' },
  { id: 'sell', label: '팝니다' },
];

export function TradeScreen({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [showDone, setShowDone] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const doneCount = trades.filter((t) => t.status === 'done').length;
  const q = query.trim().toLowerCase();

  const list = trades.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (!showDone && t.status === 'done') return false;
    if (q) {
      const hay =
        `${t.title} ${t.place ?? ''} ${t.authorName ?? ''} ${t.price ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <StatusBar />
      <AppBar
        title="거래"
        right={
          <IconButton
            aria-label={searchOpen ? '검색 닫기' : '검색'}
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setQuery('');
            }}
          >
            {searchOpen ? '✕' : '🔍'}
          </IconButton>
        }
      />

      {searchOpen && (
        <div style={{ padding: '12px var(--gap) 0' }}>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목 · 장소 · 닉네임 · 가격"
            className="text-input"
            style={{ fontSize: 11 }}
            aria-label="거래글 검색"
          />
          {q && (
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
              }}
            >
              검색결과 {list.length}건
            </div>
          )}
        </div>
      )}

      <div style={{ height: 14 }} />
      <Segmented items={FILTERS} value={filter} onChange={setFilter} />

      {/* 완료 보이기 토글 */}
      <label
        style={{
          margin: '8px var(--gap) 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--f1)',
          fontSize: 9,
          letterSpacing: 0.3,
          color: 'var(--ink3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={showDone}
          onChange={(e) => setShowDone(e.target.checked)}
          style={{ margin: 0, cursor: 'pointer' }}
        />
        완료된 글 보이기{doneCount > 0 ? ` (${doneCount})` : ''}
      </label>

      <div className="sect">
        {list.length === 0 ? (
          <div className="trade-card">
            <div className="trade-title">
              {q ? `"${query}" 에 해당하는 거래글이 없어요` : '해당 카테고리에 거래글이 없어요'}
            </div>
          </div>
        ) : (
          list.map((t) => <TradeCard key={t.id} trade={t} showChatCount />)
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

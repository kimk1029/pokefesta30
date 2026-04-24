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

  const doneCount = trades.filter((t) => t.status === 'done').length;

  const list = trades.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (!showDone && t.status === 'done') return false;
    return true;
  });

  return (
    <>
      <StatusBar />
      <AppBar
        title="거래"
        right={
          <IconButton aria-label="검색">
            🔍
          </IconButton>
        }
      />

      <div style={{ height: 14 }} />
      <Segmented items={FILTERS} value={filter} onChange={setFilter} />

      {/* 완료 보이기 토글 — 작게 */}
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
            <div className="trade-title">해당 카테고리에 거래글이 없어요</div>
          </div>
        ) : (
          list.map((t) => <TradeCard key={t.id} trade={t} showComments />)
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

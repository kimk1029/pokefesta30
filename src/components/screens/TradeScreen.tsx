'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { StatusBar } from '@/components/StatusBar';
import type { Trade, TradeType } from '@/lib/types';

type Filter = 'all' | TradeType;

interface Props {
  trades: Trade[];
}

export function TradeScreen({ trades }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const list = trades.filter((t) => filter === 'all' || t.type === filter);

  return (
    <>
      <StatusBar />
      <AppHeader />
      <div className="screen-title-bar">
        <div>
          <h1>거래</h1>
          <div className="sub">장소 태그 필수</div>
        </div>
        <button className="icon-btn" type="button">🔍</button>
      </div>

      <div className="segmented">
        <button
          type="button"
          className={`seg ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          type="button"
          className={`seg ${filter === 'buy' ? 'active' : ''}`}
          onClick={() => setFilter('buy')}
        >
          삽니다
        </button>
        <button
          type="button"
          className={`seg ${filter === 'sell' ? 'active' : ''}`}
          onClick={() => setFilter('sell')}
        >
          팝니다
        </button>
      </div>

      <div className="section">
        {list.length === 0 ? (
          <div className="trade-card"><div className="trade-title">해당 카테고리에 거래글이 없어요</div></div>
        ) : list.map((t) => (
          <div key={t.id} className="trade-card">
            <div className="trade-top">
              <span className={`tag ${t.type === 'buy' ? 'tag-buy' : 'tag-sell'}`}>
                {t.type === 'buy' ? '삽니다' : '팝니다'}
              </span>
              <span className="tag tag-place">📍 {t.place}</span>
            </div>
            <div className="trade-title">{t.title}</div>
            <div className="trade-meta">
              <span>{t.time}</span>
              <span className="dot-sep">·</span>
              <span className="price">{t.price}</span>
              <span className="dot-sep">·</span>
              <span>💬3</span>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="fab-floating">+ 글쓰기</button>
      <div style={{ height: 90 }} />
    </>
  );
}

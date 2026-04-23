'use client';

import { useState } from 'react';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MY_PROFILE, SHOP_ITEMS } from '@/lib/data';
import type { ShopCategory, ShopItem } from '@/lib/types';

type Tab = 'all' | ShopCategory;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'charge', label: '포인트 충전' },
  { id: 'ticket', label: '이용권' },
  { id: 'skin', label: '꾸미기' },
];

const TAG_LABEL: Record<NonNullable<ShopItem['tag']>, string> = {
  hot: 'HOT',
  new: 'NEW',
  limited: 'LIMIT',
};

export function ShopScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const list = SHOP_ITEMS.filter((it) => tab === 'all' || it.category === tab);

  return (
    <>
      <StatusBar />
      <AppBar title="상점" showBack right={<LivePill label={`${MY_PROFILE.points.toLocaleString()}P`} />} />

      <div style={{ height: 14 }} />

      <div className="shop-seg seg-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`seg ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sect">
        <SectionTitle title="추천 상품" right={<span className="more">{list.length}개</span>} />
        {list.length === 0 ? (
          <div className="shop-card">
            <div className="sh-main">
              <div className="sh-title">준비 중이에요</div>
            </div>
          </div>
        ) : (
          list.map((it) => (
            <div key={it.id} className="shop-card">
              <div className="sh-icon" style={{ background: it.bg }}>
                {it.emoji}
              </div>
              <div className="sh-main">
                <div className="sh-title">
                  {it.name}
                  {it.tag && <span className={`sh-tag ${it.tag}`}>{TAG_LABEL[it.tag]}</span>}
                </div>
                <div className="sh-desc">{it.desc}</div>
              </div>
              <div className="sh-right">
                <span className="sh-price">💎 {it.price.toLocaleString()}P</span>
                <button type="button" className="sh-buy">
                  구매
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bggap" />
    </>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PackHitCard } from '@/lib/cardPackHits';

type SortKey = 'price-desc' | 'recent-sale' | 'listing-desc';

interface Props {
  packBg: string;
  cards: PackHitCard[];
  boxes: PackHitCard[];
  showBoxes?: boolean;
}

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'price-desc', label: '가격 높은순' },
  { key: 'recent-sale', label: '최근 거래순' },
  { key: 'listing-desc', label: '매물 많은순' },
];

function sortItems(items: PackHitCard[], sort: SortKey): PackHitCard[] {
  return [...items].sort((a, b) => {
    if (sort === 'recent-sale') return b.lastSaleSort - a.lastSaleSort || b.minPrice - a.minPrice;
    if (sort === 'listing-desc') return b.listingCount - a.listingCount || b.minPrice - a.minPrice;
    return b.minPrice - a.minPrice || b.lastSaleSort - a.lastSaleSort;
  });
}

export function PackMarketSections({ packBg, cards, boxes, showBoxes = false }: Props) {
  const [cardSort, setCardSort] = useState<SortKey>('price-desc');
  const sortedCards = useMemo(() => sortItems(cards, cardSort), [cards, cardSort]);
  const sortedBoxes = useMemo(() => sortItems(boxes, 'price-desc'), [boxes]);

  return (
    <>
      <MarketSection
        title="싱글카드 시세"
        count={cards.length}
        packBg={packBg}
        items={sortedCards}
        sort={cardSort}
        onSort={setCardSort}
        emptyText="이 팩의 싱글카드 매물을 가져오지 못했어요."
      />

      {showBoxes ? (
        <MarketSection
          title="상자/팩 매물"
          count={boxes.length}
          packBg={packBg}
          items={sortedBoxes}
          emptyText="상자/팩 매물을 가져오지 못했어요."
        />
      ) : null}
    </>
  );
}

function MarketSection({
  title,
  count,
  packBg,
  items,
  sort,
  onSort,
  emptyText,
}: {
  title: string;
  count: number;
  packBg: string;
  items: PackHitCard[];
  sort?: SortKey;
  onSort?: (sort: SortKey) => void;
  emptyText: string;
}) {
  return (
    <div className="sect">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 13, letterSpacing: 0.4 }}>{title}</div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 4 }}>{count}개 매물</div>
        </div>
        {sort && onSort ? (
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            aria-label="정렬"
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              height: 32,
              padding: '0 8px',
              background: 'var(--white)',
              color: 'var(--ink)',
              border: 0,
              boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.8),3px 3px 0 var(--ink)',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: 30, textAlign: 'center', background: 'var(--white)',
            fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {items.map((hit) => (
            <MarketCard key={hit.apparelId} hit={hit} packBg={packBg} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ hit, packBg }: { hit: PackHitCard; packBg: string }) {
  return (
    <Link
      href={`/cards/snkrdunk/${hit.apparelId}`}
      className="pack-grid-card"
      style={{ borderTop: `4px solid ${packBg}` }}
    >
      <div
        style={{
          height: 160, background: 'var(--pap2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {hit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.imageUrl} alt={hit.koName || hit.shortName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 36 }}>CARD</span>
        )}
      </div>
      <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
        <div
          style={{
            fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 0.2, marginBottom: 5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 28,
            lineHeight: 1.45,
          }}
        >
          {hit.koName || hit.shortName}
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 7,
            color: 'var(--ink3)',
            marginBottom: 5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {hit.name}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
          {hit.minPrice > 0 ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '시세 없음'}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 3, letterSpacing: 0.3, minHeight: 12 }}>
          {hit.lastSaleText ? `최근 ${hit.lastSaleText}` : hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
        </div>
      </div>
    </Link>
  );
}

'use client';

import { AdFitSlot } from './ads/AdFitSlot';
import { AdSenseSlot } from './ads/AdSenseSlot';

const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED ?? '';
const ADFIT_UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ?? '';

/**
 * 피드 인라인 광고 — AdSense / AdFit 50:50 교대.
 * index = 광고 등장 순번 (피드 인덱스 아님).
 */
export function FeedAdRow({ index }: { index: number }) {
  const useAdSense = index % 2 === 0;

  return (
    <div
      className="feed-item"
      style={{ flexDirection: 'column', alignItems: 'stretch', padding: '8px 10px' }}
      aria-label="광고"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: '2px dashed var(--pap3)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 8,
            color: 'var(--ink3)',
            letterSpacing: 1,
          }}
        >
          광고 · AD
        </span>
        <span
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 7,
            color: 'var(--ink3)',
            letterSpacing: 0.5,
          }}
        >
          {useAdSense ? 'AdSense' : 'AdFit'}
        </span>
      </div>
      <div style={{ minHeight: 100, display: 'grid', placeItems: 'center' }}>
        {useAdSense ? (
          <AdSenseSlot slotId={ADSENSE_SLOT} />
        ) : (
          <AdFitSlot adUnit={ADFIT_UNIT} />
        )}
      </div>
    </div>
  );
}

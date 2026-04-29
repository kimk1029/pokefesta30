'use client';

import { AdFitSlot } from './ads/AdFitSlot';

const ADFIT_UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ?? '';

/**
 * 피드 인라인 광고 — Kakao AdFit 단독.
 * (AdSense 미신청 상태라 AdFit 만 사용. 추후 AdSense 승인 시 교대 노출 복원 가능.)
 */
export function FeedAdRow() {
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
          AdFit
        </span>
      </div>
      <div style={{ minHeight: 100, display: 'grid', placeItems: 'center' }}>
        <AdFitSlot adUnit={ADFIT_UNIT} />
      </div>
    </div>
  );
}

'use client';

import { AdFitSlot } from './ads/AdFitSlot';

const ADFIT_UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ?? '';

/**
 * 피드 인라인 광고 — Kakao AdFit.
 * .feed-item 셸을 그대로 써서 일반 피드 항목과 같은 세로 높이를 유지한다.
 * (AdSense 미신청 상태라 AdFit 만 사용. 추후 승인 시 교대 노출 복원 가능.)
 */
export function FeedAdRow() {
  return (
    <div
      className="feed-item"
      aria-label="광고"
      style={{ position: 'relative', padding: '12px 14px', alignItems: 'center' }}
    >
      <span
        style={{
          position: 'absolute',
          top: 6,
          right: 10,
          fontFamily: 'var(--f1)',
          fontSize: 7,
          color: 'var(--ink3)',
          letterSpacing: 0.5,
          background: 'var(--white)',
          padding: '1px 4px',
          zIndex: 1,
        }}
      >
        광고 · AD
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <AdFitSlot adUnit={ADFIT_UNIT} />
      </div>
    </div>
  );
}

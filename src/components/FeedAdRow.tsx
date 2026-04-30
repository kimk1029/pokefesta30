'use client';

import { AdFitSlot } from './ads/AdFitSlot';
import { AdSenseSlot } from './ads/AdSenseSlot';

const ADFIT_UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ?? '';
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED ?? '';
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';

/**
 * 피드 인라인 광고 — 네트워크 교대 노출.
 *
 * 4번째 글마다 광고 1개씩 박는 정책을 만족시키려면 한 페이지에 광고가 여러 개 떠야 하는데
 * AdFit SDK 는 같은 ad-unit 으로는 페이지당 1개만 fill 한다 (두 번째부터 빈 박스). 따라서:
 *   - slotIndex === 0  : AdFit (1개만 채워지므로 첫 슬롯 차지)
 *   - slotIndex >= 1   : AdSense (같은 slotId 로 여러 슬롯 fill 가능)
 *
 * AdSense 미구성이면 후속 슬롯은 "AdSense — env 미설정" placeholder.
 * AdFit 미구성이면 첫 슬롯도 placeholder. 두 네트워크 모두 등록하면 빈 박스 0.
 */
export function FeedAdRow({ slotIndex = 0 }: { slotIndex?: number }) {
  const useAdSense = slotIndex >= 1 && (ADSENSE_CLIENT && ADSENSE_SLOT);

  return (
    <div
      className="feed-item"
      aria-label="광고"
      style={{ position: 'relative', padding: 0, alignItems: 'stretch', gap: 0 }}
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
        {useAdSense ? <AdSenseSlot slotId={ADSENSE_SLOT} /> : <AdFitSlot adUnit={ADFIT_UNIT} />}
      </div>
    </div>
  );
}

'use client';

import { AdFitSlot } from './ads/AdFitSlot';

/**
 * AdFit 광고 단위 ID 목록 — 4번째 글마다 광고가 들어가는 모든 슬롯에서 빈 박스 없이
 * 노출되려면 슬롯 수만큼의 ad-unit 이 필요.
 *
 * AdFit SDK 는 같은 ad-unit 을 페이지에서 1번만 fill 한다 (서버측 dedupe).
 * 따라서 슬롯마다 각자 다른 ad-unit 을 배정해야 모두 채워짐.
 *
 * 입력 우선순위:
 *   1. NEXT_PUBLIC_ADFIT_UNITS_FEED — 콤마 구분 (예: "DAN-aaa,DAN-bbb,DAN-ccc")
 *   2. NEXT_PUBLIC_ADFIT_UNIT_FEED  — 단일 (기존 호환)
 *
 * 슬롯 N 에 매핑되는 unit 이 없으면 그 슬롯은 렌더링되지 않음 (빈 박스 안 생김).
 * → 사용자는 추가 슬롯에 광고를 띄우려면 AdFit 대시보드에서 ad-unit 을 추가 등록 후
 *   콤마로 환경변수에 늘리면 됨.
 */
const ADFIT_UNITS: string[] = (
  process.env.NEXT_PUBLIC_ADFIT_UNITS_FEED ??
  process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ??
  ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function FeedAdRow({ slotIndex = 0 }: { slotIndex?: number }) {
  const unit = ADFIT_UNITS[slotIndex];
  // 해당 슬롯에 매핑된 ad-unit 이 없으면 슬롯 자체를 생략 (빈 박스 방지)
  if (!unit) return null;

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
        <AdFitSlot adUnit={unit} />
      </div>
    </div>
  );
}

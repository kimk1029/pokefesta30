'use client';

import { AdFitSlot } from './ads/AdFitSlot';

/**
 * 카드 리스트(검색결과·박스리스트 등) 사이에 끼우는 AdFit 광고 행.
 *
 * 사이즈: 320×100 — 리스트 카드 한 행과 비슷한 높이라 시각적으로 자연스럽게 섞임.
 * 그리드(여러 열) 안에서는 spanGrid 로 한 줄 전체를 차지하게 한다.
 *
 * 슬롯 풀 우선순위: NEXT_PUBLIC_ADFIT_UNITS_LIST > NEXT_PUBLIC_ADFIT_UNITS_FEED > NEXT_PUBLIC_ADFIT_UNIT_FEED
 *   AdFit SDK 는 같은 ad-unit 을 페이지에서 1번만 fill 하므로, 한 페이지에 여러 개를
 *   띄우려면 slotIndex 마다 다른 unit 이 매핑돼야 함. 매핑된 unit 이 없는 slotIndex 는
 *   렌더되지 않아 빈 박스가 생기지 않는다.
 */
const UNITS: string[] = (
  process.env.NEXT_PUBLIC_ADFIT_UNITS_LIST ??
  process.env.NEXT_PUBLIC_ADFIT_UNITS_FEED ??
  process.env.NEXT_PUBLIC_ADFIT_UNIT_FEED ??
  ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

interface Props {
  /** 페이지 내 광고 순번(0-based). 슬롯마다 다른 ad-unit 이 매핑됨. */
  slotIndex?: number;
  /** 부모가 grid 일 때 한 행 전체를 차지하게 한다. */
  spanGrid?: boolean;
}

export function ListAdRow({ slotIndex = 0, spanGrid = false }: Props) {
  const unit = UNITS[slotIndex];
  if (!unit) return null;
  return (
    <div
      aria-label="광고"
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        minHeight: 100,
        padding: 8,
        background: 'var(--pap2)',
        ...(spanGrid ? { gridColumn: '1 / -1' } : null),
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          right: 8,
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          letterSpacing: 0.5,
          background: 'var(--white)',
          padding: '1px 4px',
          zIndex: 1,
        }}
      >
        광고 · AD
      </span>
      <AdFitSlot adUnit={unit} width={320} height={100} />
    </div>
  );
}

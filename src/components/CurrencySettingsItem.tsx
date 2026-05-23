'use client';

import { useCurrency } from './CurrencyProvider';

/**
 * 마이페이지 설정 영역의 "통화" 행. 클릭할 때마다 JPY ↔ KRW 토글.
 * 모든 가격 표시 컴포넌트(Price)가 즉시 다시 렌더되며, 선택은 localStorage 저장.
 */
export function CurrencySettingsItem() {
  const { mode, toggle, rate } = useCurrency();
  const isKrw = mode === 'krw';

  return (
    <button
      type="button"
      className="my-item"
      onClick={toggle}
      aria-label="통화 변경"
    >
      <div
        className="mi-icon"
        style={{
          background: isKrw ? '#3A5BD9' : '#E63946',
          color: 'var(--white)',
          fontFamily: 'var(--f1)',
          fontSize: 18,
        }}
      >
        {isKrw ? '₩' : '¥'}
      </div>
      <div className="mi-main">
        통화
        <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 10 }}>
          · {isKrw ? '원화 (KRW)' : '엔화 (JPY)'}
        </span>
        {isKrw && (
          <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 9 }}>
            1¥ ≈ {rate.toFixed(2)}₩
          </span>
        )}
      </div>
      <span className="mi-arr">↔</span>
    </button>
  );
}

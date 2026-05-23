'use client';

import { usePriceMode, type PriceMode } from '@/components/PriceModeProvider';

interface Props {
  /** PSA10 시세가 있을 때만 토글이 의미 있음. 0 이거나 없으면 컴포넌트가 null 반환. */
  hasPsa10: boolean;
}

/**
 * 싱글 ↔ PSA10 토글. 상세 페이지 우측 상단에 두면 모드를 바꿔
 * 컬렉션/포트폴리오 가격 표시까지 동일 모드로 따라간다.
 */
export function PriceModeToggle({ hasPsa10 }: Props) {
  const { mode, setMode } = usePriceMode();
  if (!hasPsa10) return null;
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 0,
        boxShadow:
          '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
      }}
    >
      {(['single', 'psa10'] as PriceMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          style={{
            padding: '4px 8px',
            border: 0,
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.3,
            cursor: 'pointer',
            background: mode === m ? 'var(--gold)' : 'var(--white)',
            color: mode === m ? 'var(--ink)' : 'var(--ink3)',
          }}
        >
          {m === 'single' ? '싱글' : 'PSA10'}
        </button>
      ))}
    </div>
  );
}

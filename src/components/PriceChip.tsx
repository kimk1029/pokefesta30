import type { CSSProperties } from 'react';
import { PIXEL_BORDER } from '@/components/pixelBorder';

interface Props {
  /** 표시 라벨 — 호출부에서 format(jpy) 또는 '시세 없음' 으로 만들어 전달. */
  label: string;
  hasPrice: boolean;
  fontSize?: number;
  /** 플랫(clean 계열) 테마 — 픽셀 보더 대신 라운드 + 액센트 배색. */
  flat?: boolean;
  style?: CSSProperties;
}

/**
 * 가격 칩 — 시세 있으면 ink/gold(플랫은 accent/white), 없으면 pap2/ink3.
 * 컨테이너(부모 카드) 폭을 넘기지 않도록 maxWidth:100% + nowrap.
 * 줄임표 없이 다 표시 — fontSize 축소(autoPriceSize)만으로 폭에 맞춤. 자르지 않음.
 */
export function PriceChip({ label, hasPrice, fontSize = 11, flat = false, style }: Props) {
  return (
    <div
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        padding: '3px 6px',
        background: hasPrice ? (flat ? 'var(--accent)' : 'var(--ink)') : 'var(--pap2)',
        color: hasPrice ? (flat ? 'var(--white)' : 'var(--gold)') : 'var(--ink3)',
        fontFamily: 'var(--f1)',
        fontSize,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
        ...(flat ? { borderRadius: 'var(--r-sm)' } : { boxShadow: PIXEL_BORDER }),
        ...style,
      }}
    >
      {label}
    </div>
  );
}

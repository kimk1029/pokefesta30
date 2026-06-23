'use client';

import { useCurrency } from '@/components/CurrencyProvider';
import { autoPriceSize } from '../../shared/util/autoPriceSize';

interface Props {
  /** 원본 가격 (JPY 기준). 0 이하면 자리표시자 렌더. */
  jpy: number;
  /** 가격이 0/없을 때 표시할 자리표시자. 기본 '—'. */
  empty?: string;
  className?: string;
  /**
   * 지정 시: 이 값을 기본 fontSize 로 두고 금액 길이에 따라 자동 축소(px).
   * 큰 금액(₩12,345,000 등)이 컨테이너를 넘기지 않게 글자만 줄여 한 줄에 다 표시.
   */
  autoSizeBase?: number;
  /** autoSize 최소 fontSize. 기본 9. */
  autoSizeMin?: number;
  style?: React.CSSProperties;
}

/**
 * 카드 시세 표시용 클라이언트 컴포넌트.
 * 사용자가 설정에서 통화 모드 (JPY/KRW) 를 토글하면 실시간으로 환산되어 다시 렌더.
 * 금액은 절대 줄바꿈하지 않는다(whiteSpace:nowrap) — 한 줄에 다 들어오게.
 */
export function Price({ jpy, empty = '—', className, autoSizeBase, autoSizeMin = 9, style }: Props) {
  const { format } = useCurrency();
  const text = !Number.isFinite(jpy) || jpy <= 0 ? empty : format(jpy);
  const sizeStyle: React.CSSProperties =
    autoSizeBase != null ? { fontSize: autoPriceSize(text, autoSizeBase, autoSizeMin) } : {};
  return (
    <span className={className} style={{ whiteSpace: 'nowrap', ...sizeStyle, ...style }}>
      {text}
    </span>
  );
}

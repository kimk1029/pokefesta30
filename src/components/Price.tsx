'use client';

import { useCurrency } from '@/components/CurrencyProvider';

interface Props {
  /** 원본 가격 (JPY 기준). 0 이하면 자리표시자 렌더. */
  jpy: number;
  /** 가격이 0/없을 때 표시할 자리표시자. 기본 '—'. */
  empty?: string;
  className?: string;
}

/**
 * 카드 시세 표시용 클라이언트 컴포넌트.
 * 사용자가 설정에서 통화 모드 (JPY/KRW) 를 토글하면 실시간으로 환산되어 다시 렌더.
 */
export function Price({ jpy, empty = '—', className }: Props) {
  const { format } = useCurrency();
  if (!Number.isFinite(jpy) || jpy <= 0) {
    return <span className={className}>{empty}</span>;
  }
  return <span className={className}>{format(jpy)}</span>;
}

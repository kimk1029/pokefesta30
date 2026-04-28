'use client';

interface Props {
  adUnit: string;
  /** AdFit 등록 시 정한 가로 — DAN-iL71cYDIUXbuGNA5 = 320 */
  width?: number;
  /** AdFit 등록 시 정한 세로 — DAN-iL71cYDIUXbuGNA5 = 100 */
  height?: number;
}

/**
 * 광고 기능 중단 중.
 * 외부 SDK 실행과 노출 비콘 전송을 하지 않는다.
 */
export function AdFitSlot(_props: Props) {
  return null;
}

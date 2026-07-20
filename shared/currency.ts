/**
 * 통화 표시 모드 — 웹·모바일 공유 단일 소스. 'jpy' = ¥ (스니덩크 원본),
 * 'krw' = ₩ (실시간 환율 환산). 플랫폼 저장소 접근(localStorage/kvStore)은
 * 각 플랫폼 shim(src/lib/currency.ts 등)에 남긴다.
 */
export type CurrencyMode = 'jpy' | 'krw';

export const CURRENCY_STORAGE_KEY = 'pf30:currency';
export const DEFAULT_MODE: CurrencyMode = 'jpy';
/** 모바일 쪽 기존 명칭 호환 alias — 동일 값. */
export const DEFAULT_CURRENCY_MODE: CurrencyMode = DEFAULT_MODE;
export const DEFAULT_JPY_KRW = 9.5;

/**
 * JPY 값을 현재 모드에 맞춰 포맷.
 *   formatPrice(1234, 'jpy', 9.5) → '¥1,234'
 *   formatPrice(1234, 'krw', 9.5) → '₩11,723'
 */
export function formatPrice(jpy: number, mode: CurrencyMode, rate: number): string {
  if (!Number.isFinite(jpy) || jpy <= 0) {
    return mode === 'krw' ? '₩0' : '¥0';
  }
  if (mode === 'krw') {
    const krw = Math.round(jpy * (rate > 0 ? rate : DEFAULT_JPY_KRW));
    return `₩${krw.toLocaleString('ko-KR')}`;
  }
  return `¥${Math.round(jpy).toLocaleString('ja-JP')}`;
}

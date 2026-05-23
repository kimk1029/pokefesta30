/**
 * 통화 표시 모드 — 웹 src/lib/currency.ts 의 mobile 미러.
 * 'jpy' (¥, snkrdunk 원본) / 'krw' (₩, 환율 환산).
 */
export type CurrencyMode = 'jpy' | 'krw';

export const CURRENCY_STORAGE_KEY = 'pf30:currency';
export const DEFAULT_CURRENCY_MODE: CurrencyMode = 'jpy';
export const DEFAULT_JPY_KRW = 9.5;

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

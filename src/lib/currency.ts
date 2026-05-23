/**
 * 통화 표시 모드. 'jpy' = ¥ (스니덩크 원본), 'krw' = ₩ (실시간 환율 환산).
 */
export type CurrencyMode = 'jpy' | 'krw';

export const CURRENCY_STORAGE_KEY = 'pf30:currency';
export const DEFAULT_MODE: CurrencyMode = 'jpy';
export const DEFAULT_JPY_KRW = 9.5;

export function loadStoredMode(): CurrencyMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const v = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return v === 'krw' || v === 'jpy' ? v : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveMode(mode: CurrencyMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, mode);
  } catch {
    // ignore quota
  }
}

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

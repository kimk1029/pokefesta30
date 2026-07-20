// 통화 모드/포맷의 정본은 [[/shared/currency.ts]] — 여기는 re-export shim +
// 웹 전용 localStorage 저장/복원만 보유.
import { CURRENCY_STORAGE_KEY, DEFAULT_MODE, type CurrencyMode } from '../../shared/currency';

export * from '../../shared/currency';

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

/**
 * JPY → KRW 실시간 환율. 메모리에 30분 캐시 (외부 API rate-limit 대비).
 * 폴백: 1 JPY ≈ 9.5 KRW (2024-2026 평균 근처. fetch 실패 시에만 사용).
 *
 * 소스: exchangerate.host (free, no API key). 다운되면 frankfurter.app 시도.
 * 환율 변동성은 30분 단위 갱신으로 충분 — 카드 시세 가격 보조 표시 용도.
 */

const TTL_MS = 30 * 60 * 1000;
const FALLBACK_JPY_KRW = 9.5;

interface RateCache {
  rate: number;
  asOf: string;
  fetchedAt: number;
}

let cached: RateCache | null = null;

async function fetchFromExchangerateHost(): Promise<number | null> {
  try {
    const r = await fetch('https://api.exchangerate.host/latest?base=JPY&symbols=KRW', {
      // node fetch — explicit timeout via AbortSignal would be ideal but undici default is OK.
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { rates?: { KRW?: number } };
    const v = j.rates?.KRW;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=JPY&to=KRW');
    if (!r.ok) return null;
    const j = (await r.json()) as { rates?: { KRW?: number } };
    const v = j.rates?.KRW;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export interface JpyKrwRate {
  rate: number;
  asOf: string;
  source: 'exchangerate.host' | 'frankfurter.app' | 'fallback' | 'cache';
}

export async function getJpyKrwRate(): Promise<JpyKrwRate> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return { rate: cached.rate, asOf: cached.asOf, source: 'cache' };
  }

  let rate = await fetchFromExchangerateHost();
  let source: JpyKrwRate['source'] = 'exchangerate.host';
  if (rate == null) {
    rate = await fetchFromFrankfurter();
    source = 'frankfurter.app';
  }
  if (rate == null) {
    return { rate: FALLBACK_JPY_KRW, asOf: new Date().toISOString(), source: 'fallback' };
  }

  cached = { rate, asOf: new Date().toISOString(), fetchedAt: now };
  return { rate, asOf: cached.asOf, source };
}

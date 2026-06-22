/**
 * JPY → KRW 실시간 환율. 메모리에 30분 캐시 (외부 API rate-limit 대비).
 * 폴백: 1 JPY ≈ 9.5 KRW (2024-2026 평균 근처. fetch 실패 시에만 사용).
 *
 * 소스: frankfurter.dev (free, no API key, ECB 기준). 다운되면 open.er-api.com 시도.
 * 환율 변동성은 30분 단위 갱신으로 충분 — 카드 시세 가격 보조 표시 용도.
 *
 * NOTE: 구 exchangerate.host 는 2024 부터 access_key 필수로 바뀌어 폐기.
 *       구 frankfurter.app 도 frankfurter.dev 로 이전(301)됐다.
 */

const TTL_MS = 30 * 60 * 1000;
const FALLBACK_JPY_KRW = 9.5;

interface RateCache {
  rate: number;
  asOf: string;
  fetchedAt: number;
}

let cached: RateCache | null = null;

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    // frankfurter.dev — 무료·무키, ECB 기준. (구 .app 도메인은 여기로 301.)
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW');
    if (!r.ok) return null;
    const j = (await r.json()) as { rates?: { KRW?: number } };
    const v = j.rates?.KRW;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

async function fetchFromErApi(): Promise<number | null> {
  try {
    // open.er-api.com — 무료·무키 폴백. base=JPY 의 rates.KRW.
    const r = await fetch('https://open.er-api.com/v6/latest/JPY');
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
  source: 'frankfurter.dev' | 'open.er-api.com' | 'fallback' | 'cache';
}

/**
 * 동기 접근자 — 마지막으로 캐시된 JPY→KRW (없으면 폴백). priceSummary 같은
 * 동기 코드에서 환산용. 호출 시 캐시가 비어/만료됐으면 백그라운드 갱신을 건다.
 */
export function getCachedJpyKrw(): number {
  const now = Date.now();
  if (!cached || now - cached.fetchedAt >= TTL_MS) {
    // fire-and-forget 갱신 — 이번 호출은 폴백/직전값으로 즉시 반환.
    void getJpyKrwRate().catch(() => undefined);
  }
  return cached?.rate ?? FALLBACK_JPY_KRW;
}

export async function getJpyKrwRate(): Promise<JpyKrwRate> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return { rate: cached.rate, asOf: cached.asOf, source: 'cache' };
  }

  let rate = await fetchFromFrankfurter();
  let source: JpyKrwRate['source'] = 'frankfurter.dev';
  if (rate == null) {
    rate = await fetchFromErApi();
    source = 'open.er-api.com';
  }
  if (rate == null) {
    return { rate: FALLBACK_JPY_KRW, asOf: new Date().toISOString(), source: 'fallback' };
  }

  cached = { rate, asOf: new Date().toISOString(), fetchedAt: now };
  return { rate, asOf: cached.asOf, source };
}

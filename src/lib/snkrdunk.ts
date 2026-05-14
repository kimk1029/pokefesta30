/**
 * SNKRDUNK 비공식 v1 JSON API 호출.
 *
 * - 인증/쿠키 불필요
 * - 응답 그대로 받아 필요한 필드만 노출
 * - Next.js fetch revalidate 로 10분 캐시 (서버사이드 호출 전제)
 *
 * 참고: 비공식이므로 스키마/엔드포인트가 사전 통보 없이 변경될 수 있음.
 */

const SNKRDUNK_ORIGIN = 'https://snkrdunk.com';
const REVALIDATE_SEC = 600;

const SNKRDUNK_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const COMMON_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
  'User-Agent': SNKRDUNK_USER_AGENT,
};

export interface SnkrdunkApparel {
  id: number;
  name: string;
  localizedName: string;
  imageUrl: string | null;
  minPrice: number;
  regularPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  releasedAt: string | null;
  productNumber: string;
}

export interface SnkrdunkSaleEntry {
  price: number;
  date: string;
  size: string;
  condition: string;
  /** "中古" 등 거래 라벨. 싱글카드 응답에만 옴. */
  label: string;
}

export interface SnkrdunkSalesHistory {
  history: SnkrdunkSaleEntry[];
}

export interface SnkrdunkSalesChart {
  points: Array<[number, number]>;
  rangeKeys: Array<{ key: string; text: string; enabled: boolean }>;
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

/**
 * 스니다 응답의 일본어 상대시간/단위/라벨을 한국어로 변환.
 *   "16分前"   → "16분 전"
 *   "1時間前"  → "1시간 전"
 *   "1日前"    → "1일 전"
 *   "1週間前"  → "1주 전"
 *   "1ヶ月前"  → "1개월 전"
 *   "1年前"    → "1년 전"
 *   "1個"      → "1개"
 *   "中古"     → "중고"
 *   "新品"     → "새상품"
 */
export function localizeSnkrdunkText(value: string | null | undefined): string {
  if (!value) return '';
  let v = String(value);
  v = v.replace(/(\d+)\s*分前/g, '$1분 전');
  v = v.replace(/(\d+)\s*時間前/g, '$1시간 전');
  v = v.replace(/(\d+)\s*日前/g, '$1일 전');
  v = v.replace(/(\d+)\s*週間前/g, '$1주 전');
  v = v.replace(/(\d+)\s*ヶ月前/g, '$1개월 전');
  v = v.replace(/(\d+)\s*年前/g, '$1년 전');
  v = v.replace(/(\d+)\s*個/g, '$1개');
  v = v.replace(/中古/g, '중고');
  v = v.replace(/新品/g, '새상품');
  return v;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const url = `${SNKRDUNK_ORIGIN}${path}`;
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: REVALIDATE_SEC },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[snkrdunk] non-OK', res.status, path);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('[snkrdunk] fetch failed', path, err);
    return null;
  }
}

interface RawApparel {
  id: number;
  name?: string;
  localizedName?: string;
  primaryMedia?: { imageUrl?: string };
  minPrice?: number;
  usedMinPrice?: number;
  regularPrice?: number;
  displayPrice?: string;
  listingCount?: number;
  usedListingCount?: number;
  listingCountText?: string;
  usedListingCountText?: string;
  releasedAt?: string;
  productNumber?: string;
}

export async function fetchSnkrdunkApparel(apparelId: number): Promise<SnkrdunkApparel | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  const raw = await fetchJson<RawApparel>(`/v1/apparels/${apparelId}`);
  if (!raw) return null;
  // 싱글카드는 신품(minPrice) 시장이 없고 중고(usedMinPrice)만 있음. 박스/팩은 반대.
  // 활성 쪽을 통합 필드에 노출.
  const newMin = raw.minPrice ?? 0;
  const usedMin = raw.usedMinPrice ?? 0;
  const useUsed = newMin <= 0 && usedMin > 0;
  return {
    id: raw.id,
    name: raw.name ?? '',
    localizedName: raw.localizedName ?? raw.name ?? '',
    imageUrl: raw.primaryMedia?.imageUrl ?? null,
    minPrice: useUsed ? usedMin : newMin,
    regularPrice: raw.regularPrice ?? 0,
    displayPrice: raw.displayPrice ?? '',
    listingCount: useUsed ? (raw.usedListingCount ?? 0) : (raw.listingCount ?? 0),
    listingCountText: useUsed ? (raw.usedListingCountText ?? '') : (raw.listingCountText ?? ''),
    releasedAt: raw.releasedAt ?? null,
    productNumber: raw.productNumber ?? '',
  };
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  // 싱글카드는 size_id/page/per_page 가 필수, 박스도 이 형태에서 정상 응답.
  return fetchJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
}

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  // 박스/팩: /sales-chart. 싱글카드: /sales-chart/used. 둘 다 시도해서 데이터 있는 쪽 반환.
  const main = await fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
  if (main && main.points && main.points.length > 0) return main;
  return fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart/used`);
}

export interface SnkrdunkSearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

/** SNKRDUNK 검색 — JSON API가 공개되지 않아 SSR HTML을 파싱해서 결과를 반환. */
export async function fetchSnkrdunkSearch(
  query: string,
  page = 1,
): Promise<SnkrdunkSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const p = Number.isInteger(page) && page > 1 ? `&page=${page}` : '';
  const url = `${SNKRDUNK_ORIGIN}/search?keywords=${encodeURIComponent(q)}${p}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
        'User-Agent': SNKRDUNK_USER_AGENT,
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseSnkrdunkSearchHtml(html);
  } catch (err) {
    console.error('[snkrdunk] search failed', err);
    return [];
  }
}

/**
 * 추천/전체 목록용 카드 풀. 전용 API가 없어 검색 HTML을 일본어 키워드로 스크래핑.
 * page=1 부터 시작, 결과 없으면 빈 배열 → 호출자가 페이지네이션 종료 신호로 사용.
 */
export const SNKRDUNK_BROWSE_KEYWORD = 'ポケモンカード';

export async function fetchSnkrdunkBrowse(page = 1): Promise<SnkrdunkSearchResult[]> {
  return fetchSnkrdunkSearch(SNKRDUNK_BROWSE_KEYWORD, page);
}

/**
 * 거래 포인트를 시간 버킷으로 평균내어 다운샘플링.
 * 데이터 기간에 따라 적응형 — 짧으면 원본, 수개월이면 주별, 1년 이상이면 월별.
 *
 * 입력 포인트는 [ms, price]. 출력은 버킷 시작 시각으로 정렬된 동일 형식.
 */
export type PriceDownsampleUnit = 'raw' | 'weekly' | 'monthly';

const _DAY_MS = 86_400_000;

function pickDownsampleUnit(spanMs: number): PriceDownsampleUnit {
  if (spanMs > 365 * _DAY_MS) return 'monthly';
  if (spanMs > 60 * _DAY_MS) return 'weekly';
  return 'raw';
}

/** rawPoints 의 시간 범위로 결정되는 단위. 차트 캡션/툴팁용. */
export function priceDownsampleUnit(
  points: Array<[number, number]>,
): PriceDownsampleUnit {
  if (points.length < 2) return 'raw';
  let min = points[0][0];
  let max = points[0][0];
  for (const [t] of points) {
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return pickDownsampleUnit(max - min);
}

/** UI 표시용 한국어 단위 라벨. */
export function priceUnitLabelKo(unit: PriceDownsampleUnit): string {
  if (unit === 'monthly') return '월';
  if (unit === 'weekly') return '주';
  return '건';
}

export function downsamplePricePoints(
  points: Array<[number, number]>,
): Array<[number, number]> {
  if (points.length < 2) return points.slice();
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const spanMs = sorted[sorted.length - 1][0] - sorted[0][0];
  const WEEK = 7 * _DAY_MS;
  const MONTH = 30 * _DAY_MS;
  const unit = pickDownsampleUnit(spanMs);
  if (unit === 'raw') return sorted;
  const bucket = unit === 'monthly' ? MONTH : WEEK;

  const map = new Map<number, { sum: number; n: number }>();
  for (const [ts, price] of sorted) {
    const key = Math.floor(ts / bucket) * bucket;
    const b = map.get(key);
    if (b) {
      b.sum += price;
      b.n += 1;
    } else {
      map.set(key, { sum: price, n: 1 });
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, b]) => [key, Math.round(b.sum / b.n)] as [number, number]);
}

const SEARCH_ITEM_RE =
  /<a[^>]*href="https:\/\/snkrdunk\.com\/apparels\/(\d+)"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;

/** HTML 파서 — 검색 결과 카드를 추출. */
export function parseSnkrdunkSearchHtml(html: string): SnkrdunkSearchResult[] {
  const seen = new Set<number>();
  const out: SnkrdunkSearchResult[] = [];
  let m: RegExpExecArray | null;
  // RegExp 상태가 모듈 간 공유되지 않도록 매번 새로 생성
  const re = new RegExp(SEARCH_ITEM_RE.source, SEARCH_ITEM_RE.flags);
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1]);
    if (!Number.isInteger(id) || seen.has(id)) continue;
    seen.add(id);
    const ariaLabel = decodeHtmlEntities(m[2]);
    // aria-label 형태: "{name} - ¥{price}"
    const sepIdx = ariaLabel.lastIndexOf(' - ¥');
    const name = sepIdx > 0 ? ariaLabel.slice(0, sepIdx).trim() : ariaLabel.trim();
    const priceText = sepIdx > 0 ? `¥${ariaLabel.slice(sepIdx + 4).trim()}` : '';
    out.push({ apparelId: id, name, imageUrl: m[3] || null, priceText });
    if (out.length >= 40) break;
  }
  return out;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * SNKRDUNK 비공식 v1 JSON API 호출 (모바일).
 *
 * 네이티브에서는 CORS 없이 직접 호출. Expo Web 빌드는 CORS로 차단되므로
 * 그 경우 Next.js 백엔드의 /api/snkrdunk/* 프록시를 거쳐야 함 (현재 미적용).
 */

function abortAfter(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

const SNKRDUNK_ORIGIN = 'https://snkrdunk.com';

export interface SnkrdunkApparel {
  id: number;
  localizedName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

interface RawApparel {
  id: number;
  name?: string;
  localizedName?: string;
  primaryMedia?: { imageUrl?: string };
  minPrice?: number;
  usedMinPrice?: number;
  listingCountText?: string;
  usedListingCountText?: string;
}

export async function fetchSnkrdunkApparel(apparelId: number): Promise<SnkrdunkApparel | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  try {
    const res = await fetch(`${SNKRDUNK_ORIGIN}/v1/apparels/${apparelId}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: abortAfter(8000),
    });
    if (!res.ok) return null;
    const raw: RawApparel = await res.json();
    // 싱글카드는 신품 시장이 없고 중고만 거래됨. 박스/팩은 반대.
    const newMin = raw.minPrice ?? 0;
    const usedMin = raw.usedMinPrice ?? 0;
    const useUsed = newMin <= 0 && usedMin > 0;
    return {
      id: raw.id,
      localizedName: raw.localizedName ?? raw.name ?? '',
      imageUrl: raw.primaryMedia?.imageUrl ?? null,
      minPrice: useUsed ? usedMin : newMin,
      listingCountText: useUsed
        ? (raw.usedListingCountText ?? '')
        : (raw.listingCountText ?? ''),
    };
  } catch {
    return null;
  }
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

/** 스니다 응답의 일본어 상대시간/단위/라벨을 한국어로 변환. */
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

export interface SnkrdunkSaleEntry {
  price: number;
  date: string;
  size: string;
  condition: string;
  label: string;
}

export interface SnkrdunkSalesHistory {
  history: SnkrdunkSaleEntry[];
}

export interface SnkrdunkSalesChart {
  points: Array<[number, number]>;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SNKRDUNK_ORIGIN}${path}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: abortAfter(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  return getJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
}

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  const main = await getJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
  if (main && main.points && main.points.length > 0) return main;
  return getJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart/used`);
}

export interface SnkrdunkCardSeed {
  apparelId: number;
  shortName: string;
  category: 'SAR' | '프로모' | 'SR' | '원피스';
}

export const SNKRDUNK_FEATURED_CARDS: SnkrdunkCardSeed[] = [
  { apparelId: 128117, shortName: '리자몽ex SAR (151)', category: 'SAR' },
  { apparelId: 103079, shortName: '리자몽VSTAR SAR', category: 'SAR' },
  { apparelId: 100090, shortName: '피카츄 뭉크展 프로모', category: '프로모' },
  { apparelId: 106796, shortName: 'Nagaba × 피카츄 프로모', category: '프로모' },
  { apparelId: 104636, shortName: '게코우가 & 조로아크 GX SR', category: 'SR' },
  { apparelId: 108050, shortName: '루피 P-033 (점프 부록)', category: '원피스' },
];

// ────────────────────────────────────────────────────────────
// 브라우즈 / 검색 (HTML 스크래핑)
// ────────────────────────────────────────────────────────────
export interface SnkrdunkSearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

const SEARCH_ITEM_RE =
  /<a[^>]*href="https:\/\/snkrdunk\.com\/apparels\/(\d+)"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseSnkrdunkSearchHtml(html: string): SnkrdunkSearchResult[] {
  const seen = new Set<number>();
  const out: SnkrdunkSearchResult[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SEARCH_ITEM_RE.source, SEARCH_ITEM_RE.flags);
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1]);
    if (!Number.isInteger(id) || seen.has(id)) continue;
    seen.add(id);
    const ariaLabel = decodeHtmlEntities(m[2]);
    const sepIdx = ariaLabel.lastIndexOf(' - ¥');
    const name = sepIdx > 0 ? ariaLabel.slice(0, sepIdx).trim() : ariaLabel.trim();
    const priceText = sepIdx > 0 ? `¥${ariaLabel.slice(sepIdx + 4).trim()}` : '';
    out.push({ apparelId: id, name, imageUrl: m[3] || null, priceText });
    if (out.length >= 40) break;
  }
  return out;
}

export const SNKRDUNK_BROWSE_KEYWORD = 'ポケモンカード';

export async function fetchSnkrdunkBrowse(page = 1): Promise<SnkrdunkSearchResult[]> {
  const p = Number.isInteger(page) && page > 1 ? `&page=${page}` : '';
  const url = `${SNKRDUNK_ORIGIN}/search?keywords=${encodeURIComponent(SNKRDUNK_BROWSE_KEYWORD)}${p}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: abortAfter(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseSnkrdunkSearchHtml(html);
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// 차트 다운샘플링 (긴 기간을 한 화면에 보여주기 위해 주/월 평균)
// ────────────────────────────────────────────────────────────
export type PriceDownsampleUnit = 'raw' | 'weekly' | 'monthly';

const _DAY_MS = 86_400_000;

function pickDownsampleUnit(spanMs: number): PriceDownsampleUnit {
  if (spanMs > 365 * _DAY_MS) return 'monthly';
  if (spanMs > 60 * _DAY_MS) return 'weekly';
  return 'raw';
}

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

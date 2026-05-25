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
  name: string;
  localizedName: string;
  imageUrl: string | null;
  itemKind: 'single' | 'box';
  minPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  productNumber: string;
}

interface RawApparel {
  id: number;
  name?: string;
  localizedName?: string;
  primaryMedia?: { imageUrl?: string };
  displayPrice?: string;
  minPrice?: number;
  usedMinPrice?: number;
  listingCount?: number;
  usedListingCount?: number;
  listingCountText?: string;
  usedListingCountText?: string;
  totalListingCount?: number;
  totalListingCountText?: string;
  productNumber?: string;
}

interface RawApparelGroupPage {
  apparels?: RawApparel[];
  apparelsCount?: number;
}

export interface SnkrdunkApparelGroupPage {
  apparels: SnkrdunkApparel[];
  apparelsCount: number;
}

function toApparel(raw: RawApparel, itemKind: 'single' | 'box' = 'box'): SnkrdunkApparel {
  const newMin = raw.minPrice ?? 0;
  const usedMin = raw.usedMinPrice ?? 0;
  const useUsed = newMin <= 0 && usedMin > 0;
  const totalListingCount = raw.totalListingCount ?? raw.listingCount ?? 0;
  const totalListingCountText = raw.totalListingCountText ?? raw.listingCountText ?? '';
  return {
    id: raw.id,
    name: raw.name ?? '',
    localizedName: raw.localizedName ?? raw.name ?? '',
    imageUrl: raw.primaryMedia?.imageUrl ?? null,
    itemKind,
    minPrice: useUsed ? usedMin : newMin,
    displayPrice: raw.displayPrice ?? '',
    listingCount: useUsed ? (raw.usedListingCount ?? totalListingCount) : totalListingCount,
    listingCountText: useUsed ? (raw.usedListingCountText ?? totalListingCountText) : totalListingCountText,
    productNumber: raw.productNumber ?? '',
  };
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
    return toApparel(raw, useUsed ? 'single' : 'box');
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
  // 일본식 날짜 → 점 표기
  v = v.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, '$1.$2.$3');
  v = v.replace(/(\d{1,2})月(\d{1,2})日/g, '$1.$2');
  // 상대 시간
  v = v.replace(/(\d+)\s*秒前/g, '$1초 전');
  v = v.replace(/(\d+)\s*分前/g, '$1분 전');
  v = v.replace(/(\d+)\s*時間前/g, '$1시간 전');
  v = v.replace(/(\d+)\s*日前/g, '$1일 전');
  v = v.replace(/(\d+)\s*週間前/g, '$1주 전');
  v = v.replace(/(\d+)\s*ヶ月前/g, '$1개월 전');
  v = v.replace(/(\d+)\s*か月前/g, '$1개월 전');
  v = v.replace(/(\d+)\s*年前/g, '$1년 전');
  v = v.replace(/たった今/g, '방금');
  v = v.replace(/今日/g, '오늘');
  v = v.replace(/昨日/g, '어제');
  // 수량 단위
  v = v.replace(/(\d+)\s*個/g, '$1개');
  v = v.replace(/(\d+)\s*枚/g, '$1장');
  v = v.replace(/(\d+)\s*点/g, '$1점');
  v = v.replace(/(\d+)\s*件/g, '$1건');
  v = v.replace(/(\d+)\s*回/g, '$1회');
  // 상태/라벨
  v = v.replace(/中古/g, '중고');
  v = v.replace(/新品/g, '새상품');
  v = v.replace(/美品/g, '미품');
  v = v.replace(/未開封/g, '미개봉');
  v = v.replace(/開封済み/g, '개봉됨');
  v = v.replace(/開封済/g, '개봉됨');
  v = v.replace(/シュリンク付き/g, '슈링크 있음');
  v = v.replace(/シュリンクあり/g, '슈링크 있음');
  v = v.replace(/シュリンクなし/g, '슈링크 없음');
  v = v.replace(/鑑定済み/g, '감정 완료');
  v = v.replace(/鑑定品/g, '감정품');
  v = v.replace(/通常版/g, '일반판');
  v = v.replace(/プロモ/g, '프로모');
  v = v.replace(/シングル/g, '싱글');
  v = v.replace(/ボックス/g, '박스');
  v = v.replace(/ハーフ/g, '하프');
  v = v.replace(/状態/g, '상태');
  v = v.replace(/良好/g, '양호');
  v = v.replace(/折れ/g, '접힘');
  v = v.replace(/擦れ/g, '긁힘');
  v = v.replace(/キズあり/g, '흠집 있음');
  v = v.replace(/キズなし/g, '흠집 없음');
  v = v.replace(/最新/g, '최신');
  v = v.replace(/発売/g, '발매');
  v = v.replace(/送料込/g, '배송비 포함');
  v = v.replace(/送料無料/g, '배송비 무료');
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

export async function fetchSnkrdunkApparelGroup(
  groupId: number,
  opts: { apparelCategoryId: 25 | 14; page?: number; perPage?: number },
): Promise<SnkrdunkApparelGroupPage | null> {
  if (!Number.isInteger(groupId) || groupId <= 0) return null;
  const page = Number.isInteger(opts.page) && opts.page && opts.page > 0 ? opts.page : 1;
  const perPage = Number.isInteger(opts.perPage) && opts.perPage ? Math.min(Math.max(opts.perPage, 1), 100) : 100;
  const raw = await getJson<RawApparelGroupPage>(
    `/v1/apparel-groups/${groupId}?page=${page}&perPage=${perPage}&apparelCategoryId=${opts.apparelCategoryId}`,
  );
  if (!raw) return null;
  return {
    apparels: (raw.apparels ?? []).map((a) => toApparel(a, opts.apparelCategoryId === 25 ? 'single' : 'box')),
    apparelsCount: raw.apparelsCount ?? 0,
  };
}

export async function fetchAllSnkrdunkApparelGroup(
  groupId: number,
  opts: { apparelCategoryId: 25 | 14; maxItems?: number },
): Promise<SnkrdunkApparel[]> {
  const perPage = 100;
  const first = await fetchSnkrdunkApparelGroup(groupId, {
    apparelCategoryId: opts.apparelCategoryId,
    page: 1,
    perPage,
  });
  if (!first) return [];
  const maxItems = opts.maxItems ?? 600;
  const total = Math.min(first.apparelsCount, maxItems);
  const pages = Math.ceil(total / perPage);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      fetchSnkrdunkApparelGroup(groupId, {
        apparelCategoryId: opts.apparelCategoryId,
        page: i + 2,
        perPage,
      }),
    ),
  );
  return [first, ...rest].flatMap((p) => p?.apparels ?? []).slice(0, total);
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  return getJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
}

/** Two market segments we surface on the price tab:
 *   - 'single' = un-graded "raw" cards (most users hold these)
 *   - 'psa10'  = PSA-10 graded copies, typically a multi-x premium
 *  Mode toggles in the UI just swap which segment's median we display. */
export type PriceMode = 'single' | 'psa10';

/** True when the sales history has at least one PSA-10 graded transaction.
 *  Used to decide whether the singles/PSA10 toggle should be shown — packs
 *  and boxes never have PSA grades and hiding the toggle there avoids a
 *  useless control. */
export function hasPsa10Transactions(
  history: SnkrdunkSalesHistory | null | undefined,
): boolean {
  return (history?.history ?? []).some((h) => /^PSA\s*10$/i.test((h.condition ?? '').trim()));
}

/** Parse snkrdunk's relative-date strings ("3時間前", "1日前", "2025/05/10",
 *  "어제" after localization etc) into an absolute millisecond timestamp.
 *  Returns null when the format isn't recognized. */
export function parseSnkrdunkDate(text: string | null | undefined, now = Date.now()): number | null {
  if (!text) return null;
  const s = String(text).trim();
  let m: RegExpMatchArray | null;
  m = s.match(/^(\d+)\s*分前/);
  if (m) return now - Number(m[1]) * 60_000;
  m = s.match(/^(\d+)\s*時間前/);
  if (m) return now - Number(m[1]) * 3_600_000;
  m = s.match(/^(\d+)\s*日前/);
  if (m) return now - Number(m[1]) * 86_400_000;
  m = s.match(/^(\d+)\s*週間前/);
  if (m) return now - Number(m[1]) * 7 * 86_400_000;
  m = s.match(/^(\d+)\s*ヶ月前/);
  if (m) return now - Number(m[1]) * 30 * 86_400_000;
  m = s.match(/^(\d+)\s*年前/);
  if (m) return now - Number(m[1]) * 365 * 86_400_000;
  if (/^어제|^昨日/.test(s)) return now - 86_400_000;
  if (/^오늘|^今日/.test(s)) return now;
  // ISO-ish: "2025/05/10" or "2025-05-10" — accept with optional time
  m = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const t = Date.parse(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T00:00:00`);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

/** Convert sales history into `[ms, price]` pairs filtered by mode, sorted
 *  oldest→newest. Used to derive chart points when the sales-chart endpoint
 *  is empty (common for newer cards), and to split a single chart into two
 *  series (singles vs PSA10). */
export function salesHistoryToPoints(
  history: SnkrdunkSalesHistory | null | undefined,
  mode: PriceMode,
): Array<[number, number]> {
  const now = Date.now();
  const filtered = (history?.history ?? []).filter((h) => inSegment(h.condition, mode));
  const points: Array<[number, number]> = [];
  for (const h of filtered) {
    const t = parseSnkrdunkDate(h.date, now);
    const p = Number(h.price);
    if (t != null && Number.isFinite(p) && p > 0) points.push([t, p]);
  }
  return points.sort((a, b) => a[0] - b[0]);
}

function inSegment(condition: string | null | undefined, mode: PriceMode): boolean {
  const c = (condition ?? '').trim();
  if (mode === 'psa10') return /^PSA\s*10$/i.test(c);
  // single = anything that ISN'T a PSA-graded sale. "A" / "B" / "中古" /
  // 新品 / empty all qualify.
  return !/PSA\s*\d+/i.test(c);
}

/** Median price of the most recent N transactions in the given segment.
 *  Median (not mean) so a single outlier sale doesn't drag the typical
 *  price upward. Returns null when there's no usable history — caller
 *  falls back to apparel.minPrice. */
export function recentTransactionMedian(
  history: SnkrdunkSalesHistory | null | undefined,
  mode: PriceMode = 'single',
  n = 5,
): number | null {
  const filtered = (history?.history ?? [])
    .filter((h) => inSegment(h.condition, mode))
    .slice(0, n);
  const sorted = filtered
    .map((h) => Number(h.price))
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
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

/** 검색 한 페이지당 파싱 상한. 이 수만큼 차면 다음 페이지가 더 있다고 간주. */
export const SNKRDUNK_SEARCH_LIMIT = 40;

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
    if (out.length >= SNKRDUNK_SEARCH_LIMIT) break;
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

/** Free-text search. `page` 로 스니덩 검색 페이지네이션(2,3…)을 직접 넘긴다 —
 *  검색 화면 "더 보기"가 다음 페이지를 이어 받는 데 쓰인다. (legacy 컬렉션 카드의
 *  apparelId 복구에도 사용 — 그 경우 page 생략 = 1페이지.) */
export async function searchSnkrdunkByQuery(
  query: string,
  page = 1,
): Promise<SnkrdunkSearchResult[]> {
  if (!query || !query.trim()) return [];
  const p = Number.isInteger(page) && page > 1 ? `&page=${page}` : '';
  const url = `${SNKRDUNK_ORIGIN}/search?keywords=${encodeURIComponent(query.trim())}${p}`;
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

/** Find the snkrdunk apparelId for a stored collection card. We need a
 *  CONFIDENT match — naive name-only search returns sibling prints (a
 *  different ピカチュウ for example), and overwriting the price with the
 *  wrong card is worse than not refreshing at all.
 *
 *  Strategy:
 *    1. Parse setCode + cardNumber from the card's snkrdunk image URL
 *       (`pkmn-tcg-{SET}-{NUM}-…webp`) or the saved set+num fields.
 *    2. Search snkrdunk with "name + SET + NUM" — the exact format that
 *       appears in apparel titles (e.g. "ピカチュウ P [M-P 020]").
 *    3. Require the result name to contain both setCode and cardNumber.
 *    4. Return null when no result meets that bar.
 */
export async function recoverSnkrdunkApparelId(card: {
  name?: string;
  set?: string;
  num?: string;
  imageUrl?: string;
}): Promise<number | null> {
  const baseName = (card.name ?? '').split(/[\[(（【]/)[0].replace(/\s+[A-Z]$/, '').trim();
  // Extract setCode + cardNumber, preferring the image URL (most reliable
  // since the file naming is server-side and consistent).
  let setCode = '';
  let num = '';
  const urlMatch = (card.imageUrl ?? '').match(/pkmn-tcg-([A-Za-z]+(?:-[A-Za-z]+)?)-(\d+)/i);
  if (urlMatch) {
    setCode = urlMatch[1].toUpperCase();
    num = urlMatch[2];
  } else if (card.set && card.num) {
    setCode = card.set.replace(/^(세트|Set)\s*/i, '').trim().toUpperCase();
    num = String(card.num).split('/')[0].replace(/^0+(?=\d)/, '');
  }
  if (!setCode || !num) return null;
  const num3 = num.padStart(3, '0');
  const queries = [
    baseName ? `${baseName} ${setCode} ${num3}` : '',
    `${setCode} ${num3}`,
  ].filter(Boolean);
  // setCode separators in titles can be '-' / ' '; num may or may not be zero-padded.
  const setEscaped = setCode.replace(/-/g, '[-\\s]?');
  const numEscaped = num.replace(/^0+(?=\d)/, '').replace(/(\d)/g, '0?$1');
  const matchRe = new RegExp(`${setEscaped}\\s*[-_ ]?\\s*${numEscaped}\\b`, 'i');
  for (const q of queries) {
    const results = await searchSnkrdunkByQuery(q);
    const best = results.find((r) => matchRe.test(r.name));
    if (best?.apparelId) return best.apparelId;
  }
  return null;
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

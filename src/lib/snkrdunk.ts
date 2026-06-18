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
  itemKind: SnkrdunkItemKind;
  minPrice: number;
  regularPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  releasedAt: string | null;
  productNumber: string;
}

export type SnkrdunkItemKind = 'single' | 'box';

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

export interface SnkrdunkApparelGroupPage {
  apparels: SnkrdunkApparel[];
  apparelsCount: number;
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

/**
 * 거래 라벨(condition/label)이 '감정(그레이드)된 카드' 인지 판정.
 * snkrdunk condition 은 비등급이면 상태등급(S/A/B/C/D)·中古 처럼 숫자/등급사명이 없고,
 * 감정품이면 PSA10·PSA9·BGS9以下·PSA8以下 처럼 등급사명/숫자/"○以下" 가 들어간다.
 * RAW(비등급) 시세 집계에서 PSA 외 타 등급사(BGS·CGC 등) 오염을 막기 위해 사용.
 */
const GRADED_BADGE_RE = /PSA|BGS|CGC|SGC|ARS|ACE|BVG|HGA|以下|\d/i;
export function isGradedSnkrdunkBadge(badge: string | null | undefined): boolean {
  return GRADED_BADGE_RE.test((badge ?? '').trim());
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
  colorName?: string;
  colorLocalizedName?: string;
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
  categories?: Array<{ name?: string; localizedName?: string }>;
  totalListingCount?: number;
  totalListingCountText?: string;
  totalOfferCount?: number;
  totalOfferCountText?: string;
}

interface RawApparelGroupPage {
  apparels?: RawApparel[];
  apparelsCount?: number;
}

function classifySnkrdunkItem(raw: RawApparel): SnkrdunkItemKind {
  const names = [
    raw.name,
    raw.localizedName,
    raw.productNumber,
    raw.colorName,
    raw.colorLocalizedName,
    ...(raw.categories ?? []).flatMap((c) => [c.name, c.localizedName]),
  ]
    .filter(Boolean)
    .join(' ');

  if (/trading-card-single|シングルカード|single/i.test(names)) return 'single';
  if (/ボックス|BOX|Box|デッキビルド|スターターセット|ポケモンセンターセット|シュリンク|trading_card/i.test(names)) {
    return 'box';
  }
  if (raw.usedMinPrice && raw.usedMinPrice > 0 && (!raw.minPrice || raw.minPrice <= 0)) return 'single';
  return 'box';
}

/**
 * 이름만으로 싱글/박스 분류 — 검색 결과(SnkrdunkSearchResult)에는 상세 itemKind 가
 * 없어 name 으로만 판별해야 할 때 사용. 박스 마커가 보이면 box, 아니면 single.
 * (DashboardScreen 클라이언트의 BOX_NAME_RE 와 마커를 일치시킬 것 — 변경 시 양쪽 수정)
 */
export function classifySnkrdunkName(name: string | null | undefined): SnkrdunkItemKind {
  const n = name ?? '';
  if (/シングルカード|trading-card-single/i.test(n)) return 'single';
  if (/ボックス|box|booster|ブースター|デッキビルド|スターター|拡張パック|ハイクラスパック|ポケモンセンターセット|シュリンク/i.test(n)) return 'box';
  return 'single';
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
    itemKind: classifySnkrdunkItem(raw),
    minPrice: useUsed ? usedMin : newMin,
    regularPrice: raw.regularPrice ?? 0,
    displayPrice: raw.displayPrice ?? '',
    listingCount: useUsed ? (raw.usedListingCount ?? 0) : (raw.listingCount ?? 0),
    listingCountText: useUsed ? (raw.usedListingCountText ?? '') : (raw.listingCountText ?? ''),
    releasedAt: raw.releasedAt ?? null,
    productNumber: raw.productNumber ?? '',
  };
}

function toSnkrdunkApparel(raw: RawApparel, itemKind?: SnkrdunkItemKind): SnkrdunkApparel {
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
    itemKind: itemKind ?? classifySnkrdunkItem(raw),
    minPrice: useUsed ? usedMin : newMin,
    regularPrice: raw.regularPrice ?? 0,
    displayPrice: raw.displayPrice ?? '',
    listingCount: useUsed ? (raw.usedListingCount ?? totalListingCount) : totalListingCount,
    listingCountText: useUsed ? (raw.usedListingCountText ?? totalListingCountText) : totalListingCountText,
    releasedAt: raw.releasedAt ?? null,
    productNumber: raw.productNumber ?? '',
  };
}

export async function fetchSnkrdunkApparelGroup(
  groupId: number,
  opts: { apparelCategoryId: 25 | 14; page?: number; perPage?: number },
): Promise<SnkrdunkApparelGroupPage | null> {
  if (!Number.isInteger(groupId) || groupId <= 0) return null;
  const page = Number.isInteger(opts.page) && opts.page && opts.page > 0 ? opts.page : 1;
  const perPage = Number.isInteger(opts.perPage) && opts.perPage ? Math.min(Math.max(opts.perPage, 1), 100) : 100;
  const raw = await fetchJson<RawApparelGroupPage>(
    `/v1/apparel-groups/${groupId}?page=${page}&perPage=${perPage}&apparelCategoryId=${opts.apparelCategoryId}`,
  );
  if (!raw) return null;
  return {
    apparels: (raw.apparels ?? []).map((a) => toSnkrdunkApparel(a, opts.apparelCategoryId === 25 ? 'single' : 'box')),
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
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => (
      fetchSnkrdunkApparelGroup(groupId, {
        apparelCategoryId: opts.apparelCategoryId,
        page: i + 2,
        perPage,
      })
    )),
  );
  return [first, ...rest]
    .flatMap((p) => p?.apparels ?? [])
    .slice(0, total);
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  // 싱글카드는 size_id/page/per_page 가 필수, 박스도 이 형태에서 정상 응답.
  const data = await fetchJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
  if (!data) return null;
  return { ...data, history: data.history.filter(isSingleUnitSale) };
}

function isSingleUnitSale(entry: SnkrdunkSaleEntry): boolean {
  const size = entry.size.trim();
  if (!size) return true;
  if (/^1\s*(個|枚)$/.test(size)) return true;
  if (/^\d+\s*(個|枚)$/.test(size)) return false;
  return true;
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

// 메인 결과 그리드 타일은 `/apparels/{id}/used/{listingId}` 처럼 id 뒤에 경로가 더
// 붙는다(특정 중고매물로 링크). 예전 정규식은 id 바로 뒤 `"` 만 매칭해 그리드 타일을
// 통째로 놓치고 상단 추천 캐러셀(맨 id 링크)만 ~20개 잡혀 "조금밖에 안 나오는" 원인이었다.
// → id 뒤 선택적 경로(`(?:\/[^"]*)?`)를 허용. 캡처(\d+)는 여전히 apparelId 만 잡는다.
const SEARCH_ITEM_RE =
  /<a[^>]*href="https:\/\/snkrdunk\.com\/apparels\/(\d+)(?:\/[^"]*)?"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;

/** 검색 한 페이지당 파싱 상한. 이 수만큼 차면 다음 페이지(page+1)가 더 있다고 간주.
 *  그리드까지 잡으면 한 페이지에 캐러셀+그리드 합쳐 40개를 넘길 수 있어 60으로 상향. */
export const SNKRDUNK_SEARCH_LIMIT = 60;

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
    if (out.length >= SNKRDUNK_SEARCH_LIMIT) break;
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

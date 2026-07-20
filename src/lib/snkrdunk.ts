/**
 * SNKRDUNK 비공식 v1 JSON API 호출 (웹/서버).
 *
 * 타입·파서·변환·로컬라이즈 등 순수 로직의 정본은 [[/shared/snkrdunk.ts]] —
 * 이 파일은 re-export + Next.js fetch(revalidate 10분 캐시) 기반 fetcher 만 보유.
 *
 * - 인증/쿠키 불필요
 * - 응답 그대로 받아 필요한 필드만 노출
 * - 참고: 비공식이므로 스키마/엔드포인트가 사전 통보 없이 변경될 수 있음.
 */
import {
  SNKRDUNK_ORIGIN,
  SNKRDUNK_USER_AGENT,
  SNKRDUNK_BROWSE_KEYWORD,
  classifySnkrdunkItem,
  isSingleUnitSale,
  parseSnkrdunkSearchHtml,
  toSnkrdunkApparel,
  type RawApparel,
  type RawApparelGroupPage,
  type SnkrdunkApparel,
  type SnkrdunkApparelGroupPage,
  type SnkrdunkSalesChart,
  type SnkrdunkSalesHistory,
  type SnkrdunkSearchResult,
} from '../../shared/snkrdunk';

export * from '../../shared/snkrdunk';

const REVALIDATE_SEC = 600;

const COMMON_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
  'User-Agent': SNKRDUNK_USER_AGENT,
};

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

export async function fetchSnkrdunkApparel(apparelId: number): Promise<SnkrdunkApparel | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  const raw = await fetchJson<RawApparel>(`/v1/apparels/${apparelId}`);
  if (!raw) return null;
  return { ...toSnkrdunkApparel(raw), itemKind: classifySnkrdunkItem(raw) };
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

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  // 박스/팩: /sales-chart. 싱글카드: /sales-chart/used. 둘 다 시도해서 데이터 있는 쪽 반환.
  const main = await fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
  if (main && main.points && main.points.length > 0) return main;
  return fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart/used`);
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

export async function fetchSnkrdunkBrowse(page = 1): Promise<SnkrdunkSearchResult[]> {
  return fetchSnkrdunkSearch(SNKRDUNK_BROWSE_KEYWORD, page);
}

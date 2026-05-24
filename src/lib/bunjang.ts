/**
 * 번개장터 비공식 JSON API 호출.
 *
 * - 인증/쿠키 불필요
 * - 검색: /api/1/find_v2.json
 * - 응답에서 필요한 필드만 추려서 노출
 *
 * 참고: 비공식이라 스키마/엔드포인트가 사전 통보 없이 바뀔 수 있음.
 */

const BUNJANG_API = 'https://api.bunjang.co.kr';
const BUNJANG_WEB = 'https://m.bunjang.co.kr';
const REVALIDATE_SEC = 120;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface BunjangItem {
  pid: string;
  name: string;
  /** 가격 (원). 숫자 변환 실패 시 0. */
  price: number;
  imageUrl: string | null;
  location: string;
  /** 찜 수. */
  favCount: number;
  /** 등록/갱신 시각 (epoch ms). */
  updatedAt: number;
  /** 광고 노출 여부. */
  ad: boolean;
  /** 상품 상세 URL. */
  productUrl: string;
}

export interface BunjangSearchPage {
  items: BunjangItem[];
  query: string;
  page: number;
}

/** 번개장터 상품 상세(모바일 웹) URL. */
export function bunjangProductUrl(pid: string): string {
  return `${BUNJANG_WEB}/products/${pid}`;
}

/** 번개장터 검색 결과 페이지(모바일 웹) URL — 앱/웹에서 직접 검색 열기용. */
export function bunjangSearchUrl(query: string): string {
  return `${BUNJANG_WEB}/search/products?q=${encodeURIComponent(query)}`;
}

interface RawProduct {
  pid?: string | number;
  name?: string;
  price?: string | number;
  product_image?: string;
  location?: string;
  num_faved?: string | number;
  update_time?: number;
  ad?: boolean;
}

interface RawFindResponse {
  result?: string;
  list?: RawProduct[];
}

/** 번개장터 썸네일 placeholder 치환: {cnt}=1, {res}=300. */
function resolveImage(tpl: string | undefined): string | null {
  if (!tpl) return null;
  return tpl.replace('{cnt}', '1').replace('{res}', '300');
}

function toNumber(v: string | number | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * 번개장터 검색.
 * @param query 검색어
 * @param page  0부터 시작 (번개장터 규약)
 * @param n     페이지당 개수 (최대 100)
 */
export async function fetchBunjangSearch(
  query: string,
  page = 0,
  n = 40,
): Promise<BunjangSearchPage> {
  const q = query.trim();
  if (!q) return { items: [], query: '', page: 0 };
  const pageNum = Number.isInteger(page) && page >= 0 ? page : 0;
  const perPage = Math.min(Math.max(Number.isInteger(n) ? n : 40, 1), 100);
  const url =
    `${BUNJANG_API}/api/1/find_v2.json` +
    `?q=${encodeURIComponent(q)}&order=score&page=${pageNum}&n=${perPage}` +
    `&stat_device=w&version=4`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      next: { revalidate: REVALIDATE_SEC },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[bunjang] non-OK', res.status, q);
      return { items: [], query: q, page: pageNum };
    }
    const data = (await res.json()) as RawFindResponse;
    const list = data.list ?? [];
    const items = list
      .filter((p) => p.pid != null)
      .map<BunjangItem>((p) => {
        const pid = String(p.pid);
        return {
          pid,
          name: (p.name ?? '').trim(),
          price: toNumber(p.price),
          imageUrl: resolveImage(p.product_image),
          location: (p.location ?? '').trim(),
          favCount: toNumber(p.num_faved),
          updatedAt: typeof p.update_time === 'number' ? p.update_time * 1000 : 0,
          ad: Boolean(p.ad),
          productUrl: bunjangProductUrl(pid),
        };
      });
    return { items, query: q, page: pageNum };
  } catch (err) {
    console.error('[bunjang] fetch failed', q, err);
    return { items: [], query: q, page: pageNum };
  }
}

/** 홈/기본 노출용 키워드. */
export const BUNJANG_DEFAULT_KEYWORD = '포켓몬카드';

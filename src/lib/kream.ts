/**
 * KREAM 검색 — 공개 JSON API가 403(서명 헤더 필요)이고 헤드리스는 안티봇 차단이라,
 * Nuxt(Vue) SSR 검색 페이지 HTML을 파싱해서 결과를 추출한다.
 *
 * 주의: KREAM은 스크래핑에 적대적이라 같은 IP로 반복 요청하면 500/차단된다.
 * 그래서 next.revalidate 로 쿼리당 캐시하고, 실패 시 빈 배열로 폴백한다(호출부는
 * "KREAM에서 검색" 이동 버튼을 항상 함께 노출).
 */

const KREAM_ORIGIN = 'https://kream.co.kr';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REVALIDATE_SEC = 300;
const MAX_ITEMS = 40;

export interface KreamItem {
  id: string;
  name: string;
  /** 즉시판매가(원). 파싱 실패 시 0. */
  price: number;
  imageUrl: string | null;
  productUrl: string;
}

export function kreamSearchUrl(query: string): string {
  return `${KREAM_ORIGIN}/search?keyword=${encodeURIComponent(query)}`;
}

export function kreamProductUrl(id: string): string {
  return `${KREAM_ORIGIN}/products/${id}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * KREAM 검색 SSR HTML 파서. 카드 래퍼는 `data-sdui-id="product_card/<id>"` 로 시작하고,
 * 상품명은 `<img alt>`, 가격은 카드 텍스트의 `숫자원`, 이미지는 kream-phinf srcset 에 있다.
 */
export function parseKreamSearchHtml(html: string): KreamItem[] {
  const noc = html.replace(/<!--[\s\S]*?-->/g, '');
  const segs = noc.split('product_card/');
  const seen = new Set<string>();
  const out: KreamItem[] = [];
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i];
    const id = (seg.match(/^(\d+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    const alt = decodeEntities((seg.match(/alt="([^"]*)"/) || [])[1] || '');
    const name = alt
      .replace(/\s+/g, ' ')
      .replace(/^포켓몬\s?TCG\s*/i, '')
      .replace(/^Pokemon\s?TCG\s*/i, '')
      // 뒤에 붙는 영문 중복명 (...) 제거 — 한글 "(일어판)" 등은 보존
      .replace(/\s*\([A-Za-z0-9][^()]*\)\s*$/, '')
      .trim();
    const text = seg.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
    const pm = text.match(/([\d,]{2,})\s*원/);
    const price = pm ? Number(pm[1].replace(/,/g, '')) : 0;
    const rawImg = (seg.match(/srcset="(https:\/\/kream-phinf[^" ]+)"/) || [])[1] || '';
    const imageUrl = rawImg ? decodeEntities(rawImg) : null;
    if (!name && !price) continue;
    seen.add(id);
    out.push({ id, name: name || '(이름 없음)', price, imageUrl, productUrl: kreamProductUrl(id) });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

/** KREAM 검색. 실패/차단 시 빈 배열. */
export async function fetchKreamSearch(query: string): Promise<KreamItem[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(kreamSearchUrl(q), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ko',
        Accept: 'text/html',
        Referer: `${KREAM_ORIGIN}/`,
      },
      next: { revalidate: REVALIDATE_SEC },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[kream] non-OK', res.status, q);
      return [];
    }
    return parseKreamSearchHtml(await res.text());
  } catch (err) {
    console.error('[kream] fetch failed', q, err);
    return [];
  }
}

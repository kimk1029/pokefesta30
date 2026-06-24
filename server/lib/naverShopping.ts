/**
 * 네이버쇼핑 검색 (공식 오픈API).
 *   GET https://openapi.naver.com/v1/search/shop.json?query=&display=&sort=asc
 *   헤더: X-Naver-Client-Id / X-Naver-Client-Secret
 *
 * 안티봇으로 막힌 search.shopping.naver.com HTML 대신 합법·안정적인 공식 API 사용.
 * lprice = 최저 판매가(원). 체결가가 아니라 "판매가(호가)".
 *
 * 자격증명: NAVER_SEARCH_CLIENT_ID/SECRET 우선, 없으면 NAVER_CLIENT_ID/SECRET(로그인용)
 * 재활용. ※ 해당 네이버 앱에 "검색" API 권한이 켜져 있어야 200 응답.
 */
const ENDPOINT = 'https://openapi.naver.com/v1/search/shop.json';

function creds(): { id: string; secret: string } | null {
  const id = process.env.NAVER_SEARCH_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function naverShoppingEnabled(): boolean {
  return creds() !== null;
}

export interface NaverShopItem {
  name: string;
  price: number;
  url: string;
  imageUrl: string | null;
  mall: string;
}

function stripHtml(s: string): string {
  return s
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function searchNaverShopping(query: string): Promise<NaverShopItem[]> {
  const c = creds();
  if (!c || !query) return [];
  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&display=30&sort=asc`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': c.id,
        'X-Naver-Client-Secret': c.secret,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[naverShopping]', res.status, await res.text().catch(() => ''));
      return [];
    }
    const json = (await res.json()) as {
      items?: Array<{ title: string; link: string; image: string; lprice: string; mallName: string }>;
    };
    return (json.items ?? [])
      .map((it) => ({
        name: stripHtml(it.title || ''),
        price: Number(it.lprice) || 0,
        url: it.link || '',
        imageUrl: it.image || null,
        mall: it.mallName || '',
      }))
      .filter((x) => x.price > 0 && x.name);
  } catch (err) {
    console.error('[naverShopping]', err);
    return [];
  }
}

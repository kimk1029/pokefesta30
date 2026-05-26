const NAVER_API = 'https://apis.naver.com';
const CAFE_ORIGIN = 'https://cafe.naver.com';
const BUNJANG_API = 'https://api.bunjang.co.kr';
const BUNJANG_WEB = 'https://m.bunjang.co.kr';
const KREAM_ORIGIN = 'https://kream.co.kr';

const MVC_CLUB_ID = 30418914;
const MVC_AUCTION_MENU_ID = 63;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface MvcAuctionItem {
  articleId: number;
  subject: string;
  writerNickname: string;
  commentCount: number;
  readCount: number;
  writtenAt: number;
  writtenAgo: string;
  thumbnailUrl: string | null;
  costText: string;
  sourceUrl: string;
  /** 목록 API 첨부 이미지 플래그 — representImage 누락 시 본문 폴백 판단용(내부). */
  attachImage?: boolean;
}

export interface BunjangItem {
  pid: string;
  name: string;
  price: number;
  imageUrl: string | null;
  location: string;
  favCount: number;
  updatedAt: number;
  productUrl: string;
}

interface RawMvcArticle {
  articleId?: number;
  subject?: string;
  writerNickname?: string;
  commentCount?: number;
  readCount?: number;
  writeDateTimestamp?: number;
  representImage?: string;
  formattedCost?: string;
  blindArticle?: boolean;
  /** 첨부 이미지 존재 여부. representImage 가 비어도 true 면 본문에 이미지가 있음. */
  attachImage?: boolean;
}

interface RawMvcList {
  message?: {
    result?: {
      articleList?: RawMvcArticle[];
    };
  };
}

interface RawBunjangProduct {
  pid?: string | number;
  name?: string;
  price?: string | number;
  product_image?: string;
  location?: string;
  num_faved?: string | number;
  update_time?: number;
}

interface RawBunjangList {
  list?: RawBunjangProduct[];
}

export function mvcArticleUrl(articleId: number): string {
  return `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/articles/${articleId}`;
}

export function bunjangSearchUrl(query: string): string {
  return `${BUNJANG_WEB}/search/products?q=${encodeURIComponent(query)}`;
}

function relativeTimeKo(ts: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function kstDateParts(now = Date.now()): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now));
  return {
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
  };
}

function isSameKstDay(ts: number): boolean {
  if (!ts) return false;
  const a = kstDateParts(ts);
  const b = kstDateParts();
  return a.month === b.month && a.day === b.day;
}

function isTodayDeadline(subject: string): boolean | null {
  const today = kstDateParts();
  const re = /(\d{1,2})\s*[\/.월]\s*(\d{1,2})/g;
  let found = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(subject)) !== null) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    found = true;
    if (month === today.month && day === today.day) return true;
  }
  return found ? false : null;
}

function stripDeadlinePrefix(subject: string): string {
  return subject
    .trim()
    .replace(/^\s*[([{][^)\]}]*?(?:마감|\d{1,2}\s*[/.월]\s*\d{1,2})[^)\]}]*[)\]}]\s*[-–:_]?\s*/, '')
    .replace(/^\s*\d{1,2}\s*[/.월]\s*\d{1,2}\s*일?\s*(?:당일)?마감\s*[-–:_]?\s*/, '')
    .trim();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cafeThumb(url: string | undefined): string | null {
  if (!url) return null;
  const clean = decodeHtmlEntities(url);
  if (!/^https?:\/\//.test(clean)) return null;
  return /[?&]type=/.test(clean) ? clean.replace(/([?&]type=)[^&]+/, '$1w300') : `${clean}?type=w300`;
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const n = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function bunjangImage(template: string | undefined): string | null {
  if (!template) return null;
  return template.replace('{cnt}', '1').replace('{res}', '300');
}

export async function fetchMvcAuctions(page = 1): Promise<MvcAuctionItem[]> {
  const url =
    `${NAVER_API}/cafe-web/cafe2/ArticleListV2dot1.json` +
    `?search.clubid=${MVC_CLUB_ID}&search.menuid=${MVC_AUCTION_MENU_ID}` +
    `&search.boardtype=L&search.page=${page}&search.perPage=50`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'ko,en-US;q=0.8',
      'User-Agent': USER_AGENT,
      Referer: `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/menus/${MVC_AUCTION_MENU_ID}`,
    },
  });
  if (!res.ok) throw new Error(`MVC ${res.status}`);
  const raw = (await res.json()) as RawMvcList;
  const rows = raw.message?.result?.articleList ?? [];
  const items: MvcAuctionItem[] = rows
    .filter((a) => !a.blindArticle && Number.isInteger(a.articleId))
    .filter((a) => {
      const subject = a.subject ?? '';
      const verdict = isTodayDeadline(subject);
      if (verdict === true) return true;
      if (verdict === false) return false;
      return isSameKstDay(a.writeDateTimestamp ?? 0);
    })
    .map((a) => {
      const articleId = a.articleId ?? 0;
      const writtenAt = a.writeDateTimestamp ?? 0;
      return {
        articleId,
        subject: stripDeadlinePrefix(a.subject ?? '') || (a.subject ?? ''),
        writerNickname: a.writerNickname ?? '',
        commentCount: a.commentCount ?? 0,
        readCount: a.readCount ?? 0,
        writtenAt,
        writtenAgo: relativeTimeKo(writtenAt),
        thumbnailUrl: cafeThumb(a.representImage),
        costText: (a.formattedCost ?? '').trim(),
        sourceUrl: mvcArticleUrl(articleId),
        attachImage: Boolean(a.attachImage),
      };
    });
  // representImage 누락(attachImage=true) 글은 본문 첫 이미지로 썸네일 폴백.
  await fillMissingThumbnails(items);
  return items;
}

const CAFE_IMG_RE = /<img[^>]+src="(https:\/\/[^"]+)"/i;

interface RawMvcArticleDetail {
  result?: { article?: { contentHtml?: string } };
}

/** 한 경매글 본문의 첫 이미지(w300 썸네일). 없거나 실패 시 null. */
async function fetchMvcFirstImage(articleId: number): Promise<string | null> {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;
  try {
    const url =
      `${NAVER_API}/cafe-web/cafe-articleapi/v3/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
      `?query=&useCafeId=true&requestFrom=A`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ko,en-US;q=0.8',
        'User-Agent': USER_AGENT,
        Referer: mvcArticleUrl(articleId),
      },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawMvcArticleDetail;
    const m = CAFE_IMG_RE.exec(raw.result?.article?.contentHtml ?? '');
    return m ? cafeThumb(m[1]) : null;
  } catch {
    return null;
  }
}

/** representImage 누락 + attachImage=true 인 글들의 썸네일을 본문 첫 이미지로 채움(cap 제한). */
async function fillMissingThumbnails(items: MvcAuctionItem[], cap = 12): Promise<void> {
  const targets = items.filter((it) => !it.thumbnailUrl && it.attachImage).slice(0, cap);
  if (targets.length === 0) return;
  const imgs = await Promise.all(targets.map((it) => fetchMvcFirstImage(it.articleId)));
  targets.forEach((it, i) => {
    if (imgs[i]) it.thumbnailUrl = imgs[i];
  });
}

/** 한 경매글의 '최종호가'(최신 댓글). 웹 navercafe.fetchMvcLatestBid 의 모바일 포팅. */
export interface MvcLatestBid {
  articleId: number;
  /** 최신 댓글에서 파싱한 호가(원). 실패 시 null. */
  amount: number | null;
  content: string;
  commentCount: number;
  writtenAt: number;
}

interface RawComment {
  content?: string;
  isDeleted?: boolean;
  updateDate?: number;
}
interface RawLatestCommentsResponse {
  result?: { comments?: { items?: RawComment[] }; displayCommentCount?: number };
}

/** 댓글 본문에서 호가(원) 파싱 — "12만3천" / "123,000" 등. */
export function parseBidAmount(content: string): number | null {
  if (!content) return null;
  const s = content.replace(/,/g, '').trim();
  const unit = s.match(/(\d+)\s*만(?:\s*(\d+)\s*천)?/);
  if (unit) {
    const man = Number(unit[1]) * 10000;
    const cheon = unit[2] ? Number(unit[2]) * 1000 : 0;
    return man + cheon;
  }
  const cheonOnly = s.match(/^(\d+)\s*천$/);
  if (cheonOnly) return Number(cheonOnly[1]) * 1000;
  const num = s.match(/\d{2,}/);
  if (num) {
    const n = Number(num[0]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export async function fetchMvcLatestBid(articleId: number): Promise<MvcLatestBid | null> {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;
  const url =
    `${NAVER_API}/cafe-web/cafe-articleapi/v2/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
    `/comments/pages/1?requestFrom=A&orderBy=desc&page=1`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ko,en-US;q=0.8',
        'User-Agent': USER_AGENT,
        Referer: `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/articles/${articleId}`,
      },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawLatestCommentsResponse;
    const items = raw?.result?.comments?.items ?? [];
    const commentCount = raw?.result?.displayCommentCount ?? items.length;
    // 정렬 가정 없이 최대 updateDate 의 유효 댓글 = 최종호가.
    let latest: RawComment | null = null;
    for (const c of items) {
      if (c.isDeleted || !(c.content ?? '').trim()) continue;
      if (!latest || (c.updateDate ?? 0) > (latest.updateDate ?? 0)) latest = c;
    }
    if (!latest) return null;
    const content = (latest.content ?? '').trim();
    return { articleId, amount: parseBidAmount(content), content, commentCount, writtenAt: latest.updateDate ?? 0 };
  } catch {
    return null;
  }
}

/** 여러 글의 최신 호가를 병렬 조회 (호출량 보호로 25건 제한). */
export async function fetchMvcLatestBids(
  articleIds: number[],
): Promise<Record<number, MvcLatestBid | null>> {
  const ids = articleIds.filter((id) => Number.isInteger(id) && id > 0).slice(0, 25);
  const results = await Promise.all(ids.map((id) => fetchMvcLatestBid(id)));
  const map: Record<number, MvcLatestBid | null> = {};
  ids.forEach((id, i) => {
    map[id] = results[i];
  });
  return map;
}

/** 응답이 없을 때 무한 대기하지 않도록 ms 후 abort 하는 시그널. */
function abortAfter(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export async function fetchBunjangItems(query = '포켓몬카드', page = 0): Promise<BunjangItem[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `${BUNJANG_API}/api/1/find_v2.json` +
    `?q=${encodeURIComponent(q)}&order=score&page=${page}&n=40&stat_device=w&version=4`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: abortAfter(10000),
  });
  if (!res.ok) throw new Error(`Bunjang ${res.status}`);
  const raw = (await res.json()) as RawBunjangList;
  return (raw.list ?? [])
    .filter((p) => p.pid != null)
    .map((p) => {
      const pid = String(p.pid);
      return {
        pid,
        name: (p.name ?? '').trim(),
        price: toNumber(p.price),
        imageUrl: bunjangImage(p.product_image),
        location: (p.location ?? '').trim(),
        favCount: toNumber(p.num_faved),
        updatedAt: typeof p.update_time === 'number' ? p.update_time * 1000 : 0,
        productUrl: `${BUNJANG_WEB}/products/${pid}`,
      };
    });
}

// ────────────────────────────────────────────────────────────
// KREAM (Nuxt SSR HTML 스크래핑 — JSON API는 403, 헤드리스 안티봇 차단)
// ────────────────────────────────────────────────────────────
export interface KreamItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  productUrl: string;
}

export function kreamSearchUrl(query: string): string {
  return `${KREAM_ORIGIN}/search?keyword=${encodeURIComponent(query)}`;
}

/** KREAM 검색 SSR HTML 파서 — 카드는 data-sdui-id="product_card/<id>", 이름은 img alt, 가격은 `숫자원`. */
function parseKreamSearchHtml(html: string): KreamItem[] {
  const noc = html.replace(/<!--[\s\S]*?-->/g, '');
  const segs = noc.split('product_card/');
  const seen = new Set<string>();
  const out: KreamItem[] = [];
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i];
    const id = (seg.match(/^(\d+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    const alt = decodeHtmlEntities((seg.match(/alt="([^"]*)"/) || [])[1] || '');
    const name = alt
      .replace(/\s+/g, ' ')
      .replace(/^포켓몬\s?TCG\s*/i, '')
      .replace(/^Pokemon\s?TCG\s*/i, '')
      .replace(/\s*\([A-Za-z0-9][^()]*\)\s*$/, '')
      .trim();
    const text = seg.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
    const pm = text.match(/([\d,]{2,})\s*원/);
    const price = pm ? Number(pm[1].replace(/,/g, '')) : 0;
    const rawImg = (seg.match(/srcset="(https:\/\/kream-phinf[^" ]+)"/) || [])[1] || '';
    const imageUrl = rawImg ? decodeHtmlEntities(rawImg) : null;
    if (!name && !price) continue;
    seen.add(id);
    out.push({ id, name: name || '(이름 없음)', price, imageUrl, productUrl: `${KREAM_ORIGIN}/products/${id}` });
    if (out.length >= 40) break;
  }
  return out;
}

/** KREAM 검색. 차단/실패 시 빈 배열(호출부는 'KREAM에서 검색' 이동 버튼을 항상 노출). */
export async function fetchKreamItems(query: string): Promise<KreamItem[]> {
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
      // KREAM 차단 시 연결을 늘어뜨림 → 6초면 끊고 폴백(이동 버튼).
      signal: abortAfter(6000),
    });
    if (!res.ok) return [];
    return parseKreamSearchHtml(await res.text());
  } catch {
    return [];
  }
}

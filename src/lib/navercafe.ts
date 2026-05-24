/**
 * 네이버 카페 비공식 JSON API 호출.
 *
 * 대상: "포켓몬카드 MVC" 카페(전체공개) — 경매 게시판.
 *   - clubId(=cafeId) 30418914, 경매 menuId 63
 *   - 전체공개(openType "O") 카페라 로그인/쿠키 없이 목록·본문·댓글 모두 조회 가능
 *   - User-Agent + Referer 헤더가 있어야 200 응답
 *
 * 참고: 비공식이라 스키마/엔드포인트가 사전 통보 없이 바뀔 수 있고,
 *       네이버 로봇정책/이용약관상 스크래핑 제약이 있을 수 있음.
 */

const NAVER_API = 'https://apis.naver.com';
const CAFE_ORIGIN = 'https://cafe.naver.com';
const REVALIDATE_SEC = 120;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 포켓몬카드 MVC 카페 + 경매 게시판 식별자. */
export const MVC_CLUB_ID = 30418914;
export const MVC_AUCTION_MENU_ID = 63;
export const MVC_CAFE_URL = 'cardmvk';

export interface MvcAuctionItem {
  articleId: number;
  subject: string;
  writerNickname: string;
  commentCount: number;
  readCount: number;
  /** 작성 시각 (epoch ms). */
  writtenAt: number;
  /** 작성 시각 한국어 상대표기 ("3분 전" 등). */
  writtenAgo: string;
  /** 마지막 댓글(입찰) 시각 (epoch ms). 댓글 없으면 0. */
  lastCommentedAt: number;
  thumbnailUrl: string | null;
  /** 마켓글 가격 표기 ("1,000원" 등). 없으면 빈 문자열. */
  costText: string;
}

export interface MvcLatestBid {
  articleId: number;
  /** 최신 댓글에서 파싱한 호가(원). 숫자 변환 실패 시 null. */
  amount: number | null;
  /** 최신 댓글 원문. */
  content: string;
  writerNickname: string;
  /** 최신 댓글 시각 (epoch ms). */
  writtenAt: number;
  /** "오늘 21:33" / "05/24 21:33" 형태 정확 시각. */
  writtenClock: string;
  commentCount: number;
}

export interface MvcCommentItem {
  id: number;
  writerNickname: string;
  content: string;
  writtenAt: number;
  writtenAgo: string;
  /** 글 작성자가 단 댓글인지. */
  byArticleWriter: boolean;
  deleted: boolean;
}

export interface MvcArticleDetail {
  articleId: number;
  subject: string;
  writerNickname: string;
  readCount: number;
  commentCount: number;
  writtenAt: number;
  writtenAgo: string;
  /** 본문 HTML을 평문으로 변환한 텍스트. */
  contentText: string;
  /** 본문에 포함된 이미지 URL 목록. */
  images: string[];
  comments: MvcCommentItem[];
  /** 가장 최근 댓글(최종호가). 댓글 없으면 null. */
  latestBid: MvcCommentItem | null;
  /** 최종호가 금액(원). 숫자 파싱 실패 시 null. */
  latestBidAmount: number | null;
  /** 카페 원문 바로가기 URL. */
  sourceUrl: string;
}

/** 카페 게시글 원문(신규 f-e UI) URL. */
export function mvcArticleUrl(articleId: number): string {
  return `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/articles/${articleId}`;
}

/** KST(Asia/Seoul) 기준 연·월·일. */
export function kstDateParts(now = Date.now()): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** KST 기준 ts 와 now 가 같은 날짜인지. */
export function isSameKstDay(ts: number, now = Date.now()): boolean {
  if (!ts) return false;
  const a = kstDateParts(ts);
  const b = kstDateParts(now);
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** KST 기준 now 가 속한 날의 00:00 (epoch ms). */
export function kstDayStartMs(now = Date.now()): number {
  const { y, m, d } = kstDateParts(now);
  // Date.UTC = 해당 달력일의 UTC 자정. KST 자정은 그보다 9시간 빠름.
  return Date.UTC(y, m - 1, d) - 9 * 3_600_000;
}

// 제목 속 "5/24", "5.24", "05/24", "5월24일", "5월 24일" 형태의 날짜.
const DEADLINE_DATE_RE = /(\d{1,2})\s*[\/.월]\s*(\d{1,2})/g;

/**
 * 제목에서 마감 날짜를 추출해 오늘(KST)인지 판정.
 *   true  = 오늘 마감으로 보이는 날짜가 있음
 *   false = 날짜가 있지만 오늘이 아님
 *   null  = 유효한 날짜를 못 찾음 (판정 불가)
 */
export function isTodayDeadline(subject: string, now = Date.now()): boolean | null {
  if (!subject) return null;
  const today = kstDateParts(now);
  const re = new RegExp(DEADLINE_DATE_RE.source, DEADLINE_DATE_RE.flags);
  let m: RegExpExecArray | null;
  let foundValid = false;
  while ((m = re.exec(subject)) !== null) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
    foundValid = true;
    if (mm === today.m && dd === today.d) return true;
  }
  return foundValid ? false : null;
}

/**
 * 경매 댓글(호가) 문자열에서 금액(원)을 추출. 못 찾으면 null.
 *   "60000" → 60000, "5,000원" → 5000, "1만" → 10000, "1만5천" → 15000
 */
export function parseBidAmount(content: string): number | null {
  if (!content) return null;
  const s = content.replace(/,/g, '').trim();
  // 한글 단위 (만/천) 조합
  const unit = s.match(/(\d+)\s*만(?:\s*(\d+)\s*천)?/);
  if (unit) {
    const man = Number(unit[1]) * 10000;
    const cheon = unit[2] ? Number(unit[2]) * 1000 : 0;
    return man + cheon;
  }
  const cheonOnly = s.match(/^(\d+)\s*천$/);
  if (cheonOnly) return Number(cheonOnly[1]) * 1000;
  // 순수 숫자 (앞쪽 우선)
  const num = s.match(/\d{2,}/);
  if (num) {
    const n = Number(num[0]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** 네이버 카페 썸네일 URL의 type 파라미터를 원하는 크기로 교체(없으면 추가). */
export function upscaleCafeThumb(url: string, type = 'f300_300'): string {
  if (!url) return url;
  if (/[?&]type=/.test(url)) return url.replace(/([?&]type=)[^&]+/, `$1${type}`);
  return `${url}${url.includes('?') ? '&' : '?'}type=${type}`;
}

/** KST 기준 정확 시각: 오늘이면 "오늘 21:33", 아니면 "05/24 21:33". */
export function kstClock(ts: number, now = Date.now()): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const mm = get('month');
  const dd = get('day');
  const hh = get('hour');
  const mi = get('minute');
  return isSameKstDay(ts, now) ? `오늘 ${hh}:${mi}` : `${mm}/${dd} ${hh}:${mi}`;
}

/** epoch ms → 한국어 상대시간 ("방금 전" / "12분 전" / "3시간 전" / "2일 전" / "2026.05.24"). */
export function relativeTimeKo(ts: number, now = Date.now()): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}

async function fetchCafeJson<T>(
  url: string,
  articleId?: number,
  opts: { fresh?: boolean } = {},
): Promise<T | null> {
  const referer = articleId
    ? mvcArticleUrl(articleId)
    : `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/menus/${MVC_AUCTION_MENU_ID}`;
  // fresh=true 면 캐시 우회(새로고침), 아니면 revalidate 캐시.
  const cacheOpt = opts.fresh ? { cache: 'no-store' as const } : { next: { revalidate: REVALIDATE_SEC } };
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ko,en-US;q=0.8',
        'User-Agent': USER_AGENT,
        Referer: referer,
      },
      ...cacheOpt,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[navercafe] non-OK', res.status, url);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('[navercafe] fetch failed', url, err);
    return null;
  }
}

interface RawListArticle {
  articleId: number;
  subject?: string;
  writerNickname?: string;
  commentCount?: number;
  readCount?: number;
  writeDateTimestamp?: number;
  lastCommentedTimestamp?: number;
  representImage?: string;
  formattedCost?: string;
  blindArticle?: boolean;
}

interface RawListResponse {
  message?: {
    status?: string;
    result?: {
      articleList?: RawListArticle[];
      hasNext?: boolean;
    };
  };
}

export interface MvcAuctionPage {
  items: MvcAuctionItem[];
  hasNext: boolean;
}

/** 경매 게시판 글 목록 (페이지당 최대 50). */
export async function fetchMvcAuctionList(
  page = 1,
  perPage = 30,
): Promise<MvcAuctionPage> {
  const p = Number.isInteger(page) && page > 0 ? page : 1;
  const pp = Math.min(Math.max(Number.isInteger(perPage) ? perPage : 30, 1), 50);
  const url =
    `${NAVER_API}/cafe-web/cafe2/ArticleListV2dot1.json` +
    `?search.clubid=${MVC_CLUB_ID}&search.menuid=${MVC_AUCTION_MENU_ID}` +
    `&search.boardtype=L&search.page=${p}&search.perPage=${pp}`;
  const raw = await fetchCafeJson<RawListResponse>(url);
  const result = raw?.message?.result;
  if (!result?.articleList) return { items: [], hasNext: false };
  const now = Date.now();
  const items = result.articleList
    .filter((a) => !a.blindArticle && Number.isInteger(a.articleId))
    .map<MvcAuctionItem>((a) => {
      const writtenAt = a.writeDateTimestamp ?? 0;
      return {
        articleId: a.articleId,
        subject: (a.subject ?? '').trim(),
        writerNickname: a.writerNickname ?? '',
        commentCount: a.commentCount ?? 0,
        readCount: a.readCount ?? 0,
        writtenAt,
        writtenAgo: relativeTimeKo(writtenAt, now),
        lastCommentedAt: a.lastCommentedTimestamp ?? 0,
        thumbnailUrl: normalizeListThumb(a.representImage),
        costText: (a.formattedCost ?? '').trim(),
      };
    });
  return { items, hasNext: Boolean(result.hasNext) };
}

export interface MvcAuctionTodayPage {
  /** 오늘(KST) 마감으로 판정된 글만. */
  items: MvcAuctionItem[];
  /** 필터 전 원본 글 수 (이 페이지). */
  rawCount: number;
  /** 카페 API 기준 다음 페이지 존재 여부. */
  hasNext: boolean;
  /** 이 페이지의 글이 모두 '오늘 마감 윈도우'보다 오래됨 → 더 볼 필요 없음. */
  reachedOld: boolean;
  page: number;
}

/**
 * 오늘(KST) 마감 경매만 추린 페이지.
 *   - 제목에 오늘 날짜 → 포함
 *   - 제목에 다른 날짜 → 제외
 *   - 날짜 판정 불가 → 오늘 작성된 글이면 포함
 * reachedOld: 글 목록은 최신순이라, 이 페이지의 가장 최근 글조차
 *   (오늘-2일) 이전이면 이후 페이지는 볼 필요가 없음(무한스크롤 종료 신호).
 */
export async function fetchMvcAuctionToday(page = 1): Promise<MvcAuctionTodayPage> {
  const now = Date.now();
  const { items: raw, hasNext } = await fetchMvcAuctionList(page, 50);
  const items = raw.filter((it) => {
    const verdict = isTodayDeadline(it.subject, now);
    if (verdict === true) return true;
    if (verdict === false) return false;
    return isSameKstDay(it.writtenAt, now); // 판정 불가 → 오늘 작성분만
  });
  const newestWritten = raw.reduce((mx, it) => Math.max(mx, it.writtenAt), 0);
  const cutoff = kstDayStartMs(now) - 2 * 86_400_000;
  const reachedOld = newestWritten > 0 && newestWritten < cutoff;
  return { items, rawCount: raw.length, hasNext, reachedOld, page };
}

interface RawLatestCommentsResponse {
  result?: {
    comments?: { items?: RawComment[] };
    displayCommentCount?: number;
  };
}

/**
 * 한 글의 최신 댓글(최종호가) 한 건. orderBy=desc 로 가장 최근 댓글이 맨 앞.
 * @param fresh true 면 캐시 우회(새로고침).
 */
export async function fetchMvcLatestBid(
  articleId: number,
  opts: { fresh?: boolean } = {},
): Promise<MvcLatestBid | null> {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;
  const url =
    `${NAVER_API}/cafe-web/cafe-articleapi/v2/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
    `/comments/pages/1?requestFrom=A&orderBy=desc&page=1`;
  const raw = await fetchCafeJson<RawLatestCommentsResponse>(url, articleId, { fresh: opts.fresh });
  const items = raw?.result?.comments?.items ?? [];
  const commentCount = raw?.result?.displayCommentCount ?? items.length;
  // desc 순서에서 삭제되지 않은 첫 댓글 = 최신 유효 호가.
  const latest = items.find((c) => !c.isDeleted && (c.content ?? '').trim());
  if (!latest) return null;
  const content = (latest.content ?? '').trim();
  const writtenAt = latest.updateDate ?? 0;
  return {
    articleId,
    amount: parseBidAmount(content),
    content,
    writerNickname: latest.writer?.nick ?? '',
    writtenAt,
    writtenClock: kstClock(writtenAt),
    commentCount,
  };
}

/** 여러 글의 최신 호가를 병렬 조회 (호출량 보호를 위해 25건으로 제한). */
export async function fetchMvcLatestBids(
  articleIds: number[],
  opts: { fresh?: boolean } = {},
): Promise<Record<number, MvcLatestBid | null>> {
  const ids = articleIds.filter((id) => Number.isInteger(id) && id > 0).slice(0, 25);
  const results = await Promise.all(ids.map((id) => fetchMvcLatestBid(id, opts)));
  const map: Record<number, MvcLatestBid | null> = {};
  ids.forEach((id, i) => {
    map[id] = results[i];
  });
  return map;
}

interface RawArticleResponse {
  result?: {
    article?: {
      subject?: string;
      contentHtml?: string;
      writeDate?: number;
      readCount?: number;
      commentCount?: number;
      writer?: { nick?: string };
    };
    comments?: { items?: RawComment[] };
  };
}

interface RawComment {
  id: number;
  content?: string;
  updateDate?: number;
  writer?: { nick?: string };
  isArticleWriter?: boolean;
  isDeleted?: boolean;
}

interface RawCommentsResponse {
  result?: {
    comments?: { items?: RawComment[] };
  };
}

function mapComment(c: RawComment, now: number): MvcCommentItem {
  const writtenAt = c.updateDate ?? 0;
  return {
    id: c.id,
    writerNickname: c.writer?.nick ?? '',
    content: c.isDeleted ? '(삭제된 댓글)' : (c.content ?? '').trim(),
    writtenAt,
    writtenAgo: relativeTimeKo(writtenAt, now),
    byArticleWriter: Boolean(c.isArticleWriter),
    deleted: Boolean(c.isDeleted),
  };
}

/** 단일 글 본문 + 댓글(여러 페이지 합산, 최대 cap). */
export async function fetchMvcArticle(
  articleId: number,
  opts: { maxComments?: number } = {},
): Promise<MvcArticleDetail | null> {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;
  const url =
    `${NAVER_API}/cafe-web/cafe-articleapi/v3/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
    `?query=&useCafeId=true&requestFrom=A`;
  const raw = await fetchCafeJson<RawArticleResponse>(url, articleId);
  const article = raw?.result?.article;
  if (!article) return null;

  const now = Date.now();
  const html = article.contentHtml ?? '';
  const writtenAt = article.writeDate ?? 0;
  const commentCount = article.commentCount ?? 0;

  // 본문 응답에 첫 페이지 댓글이 함께 옴. 더 있으면 추가 페이지 조회.
  const firstComments = raw?.result?.comments?.items ?? [];
  const maxComments = opts.maxComments ?? 200;
  let comments = firstComments.map((c) => mapComment(c, now));
  if (comments.length < Math.min(commentCount, maxComments) && firstComments.length > 0) {
    comments = await collectAllComments(articleId, comments, maxComments, now);
  }

  // 댓글은 시간 오름차순 → 마지막(가장 최근) 유효 댓글이 최종호가.
  const latestBid =
    [...comments].reverse().find((c) => !c.deleted && c.content) ?? null;
  const latestBidAmount = latestBid ? parseBidAmount(latestBid.content) : null;

  return {
    articleId,
    subject: (article.subject ?? '').trim(),
    writerNickname: article.writer?.nick ?? '',
    readCount: article.readCount ?? 0,
    commentCount,
    writtenAt,
    writtenAgo: relativeTimeKo(writtenAt, now),
    contentText: htmlToText(html),
    images: extractImages(html),
    comments,
    latestBid,
    latestBidAmount,
    sourceUrl: mvcArticleUrl(articleId),
  };
}

async function collectAllComments(
  articleId: number,
  seed: MvcCommentItem[],
  cap: number,
  now: number,
): Promise<MvcCommentItem[]> {
  const out = [...seed];
  const seen = new Set(out.map((c) => c.id));
  for (let page = 2; page <= 20 && out.length < cap; page++) {
    const url =
      `${NAVER_API}/cafe-web/cafe-articleapi/v2/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
      `/comments/pages/${page}?requestFrom=A&orderBy=asc&page=${page}`;
    const raw = await fetchCafeJson<RawCommentsResponse>(url, articleId);
    const items = raw?.result?.comments?.items ?? [];
    if (items.length === 0) break;
    let added = 0;
    for (const c of items) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(mapComment(c, now));
      added++;
    }
    if (added === 0) break;
  }
  return out.slice(0, cap);
}

const CAFE_IMG_RE = /<img[^>]+src="(https:\/\/[^"]+)"/gi;

/** 본문 HTML에서 이미지 URL 추출 (중복 제거, 최대 20장). */
export function extractImages(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(CAFE_IMG_RE.source, CAFE_IMG_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = decodeHtmlEntities(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= 20) break;
  }
  return out;
}

/** 본문 HTML을 평문 텍스트로 변환 (태그 제거, 공백 정리). */
export function htmlToText(html: string): string {
  if (!html) return '';
  let s = html;
  s = s.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeHtmlEntities(s);
  s = s.replace(/​/g, ''); // zero-width space
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** 목록 썸네일: 저해상 type=f100_100 → f300_300 으로 업스케일. */
function normalizeListThumb(url: string | undefined | null): string | null {
  if (!url) return null;
  const clean = decodeHtmlEntities(url);
  if (!/^https?:\/\//.test(clean)) return null;
  return upscaleCafeThumb(clean, 'f300_300');
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

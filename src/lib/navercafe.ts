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
  thumbnailUrl: string | null;
  /** 마켓글 가격 표기 ("1,000원" 등). 없으면 빈 문자열. */
  costText: string;
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
  /** 카페 원문 바로가기 URL. */
  sourceUrl: string;
}

/** 카페 게시글 원문(신규 f-e UI) URL. */
export function mvcArticleUrl(articleId: number): string {
  return `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/articles/${articleId}`;
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

async function fetchCafeJson<T>(url: string, articleId?: number): Promise<T | null> {
  const referer = articleId
    ? mvcArticleUrl(articleId)
    : `${CAFE_ORIGIN}/f-e/cafes/${MVC_CLUB_ID}/menus/${MVC_AUCTION_MENU_ID}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ko,en-US;q=0.8',
        'User-Agent': USER_AGENT,
        Referer: referer,
      },
      next: { revalidate: REVALIDATE_SEC },
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
        thumbnailUrl: normalizeCafeImage(a.representImage),
        costText: (a.formattedCost ?? '').trim(),
      };
    });
  return { items, hasNext: Boolean(result.hasNext) };
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

/** 카페 썸네일 URL의 type 파라미터를 목록용 크기로 정규화. */
function normalizeCafeImage(url: string | undefined | null): string | null {
  if (!url) return null;
  const clean = decodeHtmlEntities(url);
  if (!/^https?:\/\//.test(clean)) return null;
  return clean;
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

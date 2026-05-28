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
  /** 목록 API의 첨부 이미지 플래그 — representImage 누락 시 본문 폴백 판단용(내부). */
  attachImage?: boolean;
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

/**
 * 네이버 카페 이미지(pstatic)를 우리 프록시 경유 URL로 변환.
 * pstatic CDN 이 외부 referer 를 403 차단하므로, 서버에서 referer 없이 받아 되돌려준다.
 * pstatic 호스트가 아니거나 빈 값이면 원본을 그대로 반환.
 */
export function mvcImgProxy(url: string | null | undefined): string {
  if (!url) return '';
  if (!/^https:\/\/[^/]*\.pstatic\.net\//.test(url)) return url;
  return `/api/navercafe/img?u=${encodeURIComponent(url)}`;
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
export function upscaleCafeThumb(url: string, type = 'w300'): string {
  if (!url) return url;
  if (/[?&]type=/.test(url)) return url.replace(/([?&]type=)[^&]+/, `$1${type}`);
  return `${url}${url.includes('?') ? '&' : '?'}type=${type}`;
}

/**
 * 제목 앞쪽의 마감 날짜 표기를 제거 (오늘 마감만 보여주므로 중복 정보).
 *   "(5/24마감) 일판 보아행콕"  → "일판 보아행콕"
 *   "(5월24일 마감) 셀러브레이션" → "셀러브레이션"
 *   "5월24일 마감 2021 Celeb"   → "2021 Celeb"
 *   "(05/24 당일마감)_피카츄"    → "피카츄"
 */
export function stripDeadlinePrefix(subject: string): string {
  if (!subject) return '';
  let s = subject.trim();
  // 1) 선두 괄호 [( ] 안에 '마감' 또는 날짜가 든 경우 통째로 제거
  s = s.replace(/^\s*[([{][^)\]}]*?(?:마감|\d{1,2}\s*[/.월]\s*\d{1,2})[^)\]}]*[)\]}]\s*[-–:_]?\s*/, '');
  // 2) 괄호 없이 '5/24 마감' / '5월24일 마감' 형태가 선두에 온 경우
  s = s.replace(/^\s*\d{1,2}\s*[/.월]\s*\d{1,2}\s*일?\s*(?:당일)?마감\s*[-–:_]?\s*/, '');
  s = s.trim();
  return s || subject.trim();
}

/** KST 기준 정확 시각(초까지): 오늘이면 "오늘 21:33:07", 아니면 "05/24 21:33:07". */
export function kstClock(ts: number, now = Date.now()): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const mm = get('month');
  const dd = get('day');
  const time = `${get('hour')}:${get('minute')}:${get('second')}`;
  return isSameKstDay(ts, now) ? `오늘 ${time}` : `${mm}/${dd} ${time}`;
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
  /** 첨부 이미지 존재 여부. representImage 가 비어도 true 면 본문에 이미지가 있음. */
  attachImage?: boolean;
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
        attachImage: Boolean(a.attachImage),
      };
    });
  return { items, hasNext: Boolean(result.hasNext) };
}

export interface MvcAuctionPageResult {
  items: MvcAuctionItem[];
  /** 카페 API 기준 다음 페이지 존재 여부. */
  hasNext: boolean;
  page: number;
}

/**
 * 경매 게시판 한 페이지 — 마감일이 '오늘(KST)'인 글만.
 *   - 제목에 오늘 날짜 → 포함
 *   - 제목에 다른 날짜 → 제외
 *   - 날짜 판정 불가 → 오늘 작성된 글이면 포함
 * hasNext 는 게시판 원본 기준이라, 호출자는 hasNext=false 까지 모든 페이지를
 * 끝까지 로딩해야 오늘 마감 글이 누락되지 않음(조기 종료 없음).
 */
export async function fetchMvcAuctionPage(page = 1): Promise<MvcAuctionPageResult> {
  const p = Number.isInteger(page) && page > 0 ? page : 1;
  const now = Date.now();
  const { items: raw, hasNext } = await fetchMvcAuctionList(p, 50);
  const items = raw.filter((it) => {
    const verdict = isTodayDeadline(it.subject, now);
    if (verdict === true) return true;
    if (verdict === false) return false;
    return isSameKstDay(it.writtenAt, now);
  });
  // 목록 API가 representImage 를 누락한 글(attachImage=true)은 본문 첫 이미지로 폴백.
  await fillMissingThumbnails(items);
  return { items, hasNext, page: p };
}

/**
 * 오늘(KST) 마감 경매 '전체'.
 *   게시판을 hasNext=false 까지(안전 상한 maxPages) 끝까지 훑어 오늘 마감 글을 모두 모은다.
 *   오늘 마감 글이 카페 목록 여러 페이지에 흩어져 있어(예: 24개가 p1=17 + p2=7),
 *   1페이지만 보면 일부가 누락된다 → 첫 화면에서 스크롤 없이 전부 보이도록 한 번에 수집.
 *   경매 게시판은 작아(현재 ~2페이지) 비용이 낮다.
 *
 * 반환 page/hasNext 는 '마지막으로 읽은 페이지' 기준이라, 안전 상한에 걸려 중단한 경우
 * (hasNext=true) 클라이언트 무한스크롤이 그 다음 페이지부터 이어서 보강할 수 있다.
 */
export async function fetchAllTodayAuctions(maxPages = 6): Promise<MvcAuctionPageResult> {
  const cap = Math.min(Math.max(Number.isInteger(maxPages) ? maxPages : 6, 1), 30);
  const out: MvcAuctionItem[] = [];
  const seen = new Set<number>();
  let lastPage = 1;
  let hasNext = false;
  for (let p = 1; p <= cap; p++) {
    lastPage = p;
    const res = await fetchMvcAuctionPage(p);
    hasNext = res.hasNext;
    for (const it of res.items) {
      if (seen.has(it.articleId)) continue;
      seen.add(it.articleId);
      out.push(it);
    }
    if (!hasNext) break;
  }
  return { items: out, hasNext, page: lastPage };
}

/**
 * representImage 가 비어도 attachImage=true 인 글은 본문에 이미지가 있으므로,
 * 본문 첫 이미지를 가져와 리스트 썸네일을 채운다(누락 보강). 호출량 보호로 cap 제한.
 */
async function fillMissingThumbnails(items: MvcAuctionItem[], cap = 12): Promise<void> {
  const targets = items.filter((it) => !it.thumbnailUrl && it.attachImage).slice(0, cap);
  if (targets.length === 0) return;
  const imgs = await Promise.all(targets.map((it) => fetchFirstBodyImage(it.articleId)));
  targets.forEach((it, i) => {
    if (imgs[i]) it.thumbnailUrl = imgs[i];
  });
}

/** 한 글의 본문 첫 이미지 1장(w300 썸네일). 없으면 null. (revalidate 캐시) */
export async function fetchFirstBodyImage(articleId: number): Promise<string | null> {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;
  const url =
    `${NAVER_API}/cafe-web/cafe-articleapi/v3/cafes/${MVC_CLUB_ID}/articles/${articleId}` +
    `?query=&useCafeId=true&requestFrom=A`;
  const raw = await fetchCafeJson<RawArticleResponse>(url, articleId);
  const html = raw?.result?.article?.contentHtml ?? '';
  const first = extractImages(html)[0];
  return first ? upscaleCafeThumb(first, 'w300') : null;
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
  // 정렬 가정에 의존하지 않고 '최대 updateDate' 유효 댓글 선택 → 상세와 동일 기준.
  let latest: RawComment | null = null;
  for (const c of items) {
    if (c.isDeleted || !(c.content ?? '').trim()) continue;
    if (!latest || (c.updateDate ?? 0) > (latest.updateDate ?? 0)) latest = c;
  }
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
    hasNext?: boolean;
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

  // 본문 응답의 embed 댓글은 앞 일부만 와서 신뢰 불가 → v2 댓글 API로 전부 직접 조회.
  const maxComments = opts.maxComments ?? 500;
  const comments = await fetchAllComments(articleId, maxComments, now);

  // 최종호가 = 가장 최근 댓글(최대 writtenAt). 정렬 가정에 의존하지 않음 → 리스트와 일치.
  const latestBid = pickLatestComment(comments);
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

/** 가장 최근(최대 writtenAt) 유효 댓글 = 최종호가. 삭제/빈 댓글 제외. */
function pickLatestComment(comments: MvcCommentItem[]): MvcCommentItem | null {
  let best: MvcCommentItem | null = null;
  for (const c of comments) {
    if (c.deleted || !c.content) continue;
    if (!best || c.writtenAt > best.writtenAt) best = c;
  }
  return best;
}

/** v2 댓글 API로 전 페이지 수집 (asc, hasNext 따라 진행, 중복 제거, cap 제한). */
async function fetchAllComments(
  articleId: number,
  cap: number,
  now: number,
): Promise<MvcCommentItem[]> {
  const out: MvcCommentItem[] = [];
  const seen = new Set<number>();
  for (let page = 1; page <= 30 && out.length < cap; page++) {
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
    if (!raw?.result?.hasNext || added === 0) break;
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

/** 목록 썸네일: type=f100_100(저해상) → w300 으로 교체 (네이버 CDN 지원 타입). */
function normalizeListThumb(url: string | undefined | null): string | null {
  if (!url) return null;
  const clean = decodeHtmlEntities(url);
  if (!/^https?:\/\//.test(clean)) return null;
  return upscaleCafeThumb(clean, 'w300');
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

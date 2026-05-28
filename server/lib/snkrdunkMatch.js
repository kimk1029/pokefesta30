/**
 * Snkrdunk match — given OCR'd card fields (setCode + cardNumber/totalNumber
 * + optional nameJa), find the matching snkrdunk apparel and return its
 * image + JPY price.
 *
 * Caches successful matches on disk as `setCode-cardNumber → apparelId` so
 * repeat scans hit instantly. Falls back to a live search by name + code
 * when no cache entry exists, scoring results by code-substring + name-
 * substring presence. Returns null when nothing scores above the threshold.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '..', 'data', 'snkrdunk-cache.json');
const SNKR_ORIGIN = 'https://snkrdunk.com';

let cacheMem = null;
let cacheLoaded = false;

async function loadCache() {
  if (cacheLoaded) return cacheMem;
  try {
    const txt = await readFile(CACHE_PATH, 'utf8');
    cacheMem = JSON.parse(txt);
  } catch {
    cacheMem = {};
  }
  cacheLoaded = true;
  return cacheMem;
}

async function saveCache() {
  if (!cacheMem) return;
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify(cacheMem, null, 2));
  } catch (e) {
    console.warn('[snkrdunkMatch] save cache failed:', e?.message ?? e);
  }
}

function normalizeNum(n) {
  if (!n) return '';
  return String(n).replace(/^0+(?=\d)/, '');
}

function cacheKey({ setCode, cardNumber }) {
  if (!setCode || !cardNumber) return null;
  const num = normalizeNum(cardNumber).padStart(3, '0');
  return `${String(setCode).toLowerCase()}-${num}`;
}

const SEARCH_ITEM_RE =
  /<a[^>]*href="https:\/\/snkrdunk\.com\/apparels\/(\d+)"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function searchSnkrdunk(query) {
  const url = `${SNKR_ORIGIN}/search?keywords=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const seen = new Set();
    const out = [];
    const re = new RegExp(SEARCH_ITEM_RE.source, SEARCH_ITEM_RE.flags);
    let m;
    while ((m = re.exec(html)) !== null) {
      const id = Number(m[1]);
      if (!Number.isInteger(id) || seen.has(id)) continue;
      seen.add(id);
      const ariaLabel = decodeHtmlEntities(m[2]);
      const sepIdx = ariaLabel.lastIndexOf(' - ¥');
      const name = sepIdx > 0 ? ariaLabel.slice(0, sepIdx).trim() : ariaLabel.trim();
      const priceText = sepIdx > 0 ? `¥${ariaLabel.slice(sepIdx + 4).trim()}` : '';
      out.push({ apparelId: id, name, imageUrl: m[3] || null, priceText });
      if (out.length >= 20) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchApparel(apparelId) {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  try {
    const res = await fetch(`${SNKR_ORIGIN}/v1/apparels/${apparelId}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const newMin = Number(raw.minPrice ?? 0);
    const usedMin = Number(raw.usedMinPrice ?? 0);
    // Singles는 new가 없고 used만 거래되는 경우가 일반적.
    const useUsed = newMin <= 0 && usedMin > 0;
    const price = useUsed ? usedMin : newMin;
    return {
      id: raw.id,
      localizedName: raw.localizedName ?? raw.name ?? '',
      imageUrl: raw.primaryMedia?.imageUrl ?? null,
      minPrice: price,
      listingCountText: useUsed
        ? (raw.usedListingCountText ?? '')
        : (raw.listingCountText ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Score search results — code 매칭 +100, setCode 토큰 매치 +30, rarity 토큰
 * 매치 +20. confident hit 기준은 codePatterns +100 필수 (setCode/rarity 만으로는
 * 약함). nameJa 의존성 제거 — 카드 코드+세트+희귀도만으로 결정.
 *
 * For PROMO cards (setCode pattern like "m-p" / "l-p" / "sv-p"), title 형식이
 * "[X-P NNN]" 또는 "X-P NNN" 이므로 별도 패턴.
 *
 * @returns {{ item: object, score: number } | null}
 */
function pickBestMatch(results, { cardNumber, totalNumber, setCode, rarity }) {
  if (!results || results.length === 0) return null;
  const cn = normalizeNum(cardNumber);
  const tn = normalizeNum(totalNumber);
  const isPromo = setCode && /^[a-z]+-p$/i.test(setCode);
  const setLabel = String(setCode ?? '').toUpperCase();
  const rLabel = String(rarity ?? '').toUpperCase();

  // 코드 패턴 — "005/063" / "[M-P 020]" 등 변형 허용.
  const codePatterns = [];
  if (cn && tn && !isPromo) {
    const cnEsc = cn.replace(/(\d)/g, '0?$1');
    const tnEsc = tn.replace(/(\d)/g, '0?$1');
    codePatterns.push(new RegExp(`(^|[^\\d])${cnEsc}\\s*/\\s*${tnEsc}([^\\d]|$)`));
  }
  if (isPromo && cn) {
    const promo = setLabel;
    const cnPad = cn.padStart(3, '0').replace(/(\d)/g, '0?$1');
    codePatterns.push(new RegExp(`${promo}\\s*[-_ /]?\\s*${cnPad}\\b`, 'i'));
  }

  // setCode 자체 토큰 매치 (e.g. SV8A, M1S) — 짧고 영숫자 패턴만 안전.
  const setTokenPat = !isPromo && setLabel && /^[A-Z0-9]{2,8}$/.test(setLabel)
    ? new RegExp(`\\b${setLabel}\\b`, 'i')
    : null;

  // rarity 토큰 매치 (R, RR, SR, SAR, HR, UR, AR, C, U, PROMO 등 4자 이하).
  const rarityTokenPat = rLabel && /^[A-Z]{1,5}$/.test(rLabel)
    ? new RegExp(`\\b${rLabel}\\b`, 'i')
    : null;

  let best = null;
  let bestScore = -Infinity;
  for (const r of results) {
    let score = 0;
    for (const p of codePatterns) {
      if (p.test(r.name)) { score += 100; break; }
    }
    if (setTokenPat && setTokenPat.test(r.name)) score += 30;
    if (rarityTokenPat && rarityTokenPat.test(r.name)) score += 20;
    if (r.priceText) score += 3;
    if (score > bestScore) {
      best = { item: r, score };
      bestScore = score;
    }
  }
  // confident 기준: 코드 매칭(+100) 필수. setCode/rarity 매치만으로는 약함.
  if (bestScore < 100) return null;
  return best;
}

function toResult(apparelId, apparel, searchItem, cacheHit, trace) {
  const imageUrl = apparel?.imageUrl ?? searchItem?.imageUrl ?? null;
  const priceJpy = apparel?.minPrice ?? null;
  const priceText = priceJpy
    ? `¥${priceJpy.toLocaleString('ja-JP')}`
    : (searchItem?.priceText ?? '');
  return {
    apparelId,
    imageUrl,
    priceJpy,
    priceText,
    localizedName: apparel?.localizedName ?? searchItem?.name ?? '',
    listingCountText: apparel?.listingCountText ?? '',
    cacheHit,
    trace,
  };
}

/**
 * Resolve snkrdunk info for an OCR result. 4개 필드(setCode + cardNumber +
 * totalNumber + rarity) 만으로 검색 — 예: "m1S 005/063 R". nameJa/name 의존성
 * 없음 (Vision OCR 의 일본명 추출이 실패해도 안정적). cardNumber 가 없으면 검색
 * 불가능 — null.
 *
 * @param {{
 *   cardNumber?: string,
 *   totalNumber?: string,
 *   setCode?: string,
 *   rarity?: string,
 * }} input
 */
export async function matchSnkrdunkForCard(input) {
  const { cardNumber, totalNumber, setCode, rarity } = input ?? {};
  if (!cardNumber) return null;

  const trace = {
    input: { cardNumber, totalNumber, setCode, rarity },
    queries: [],
    pick: null,
    cacheKey: null,
  };

  const key = cacheKey({ setCode, cardNumber });
  trace.cacheKey = key;
  const cache = await loadCache();

  // Cache hit — refresh price (apparel JSON is light) but skip the search.
  if (key && cache[key]?.apparelId) {
    const apparelId = cache[key].apparelId;
    const apparel = await fetchApparel(apparelId);
    if (apparel) {
      trace.pick = { source: 'cache', apparelId, score: null };
      return toResult(apparelId, apparel, null, true, trace);
    }
    // Apparel disappeared from snkrdunk → drop the stale entry, fall through
    // to a fresh search.
    delete cache[key];
    saveCache().catch(() => {});
    trace.cacheKey = `${key} (stale)`;
  }

  const cn = normalizeNum(cardNumber);
  const tn = normalizeNum(totalNumber);
  const isPromo = setCode && /^[a-z]+-p$/i.test(setCode);
  const setLabel = String(setCode ?? '').trim(); // 소문자/대문자 그대로 (예: "m1S")
  const rLabel = String(rarity ?? '').trim().toUpperCase();

  // 번호 파트: 일반 카드는 "005/063", PROMO 는 "020" (totalNumber 무의미).
  let numPart = '';
  if (cn) {
    if (isPromo) {
      numPart = cn.padStart(3, '0');
    } else if (tn) {
      numPart = `${cn}/${tn}`;
    } else {
      numPart = cn;
    }
  }

  // 쿼리 우선순위 — 사용자 요청 형식 "setCode cn/tn rarity" 가 가장 강함.
  // 폴백은 점진적으로 약한 조합.
  //   1. "m1S 005/063 R"     (setCode + numPart + rarity)
  //   2. "m1S 005/063"       (setCode + numPart)
  //   3. "005/063 R"         (numPart + rarity)
  //   4. "005/063"           (numPart)
  // PROMO 는 setCode 가 "SV-P" 형태라 1~4 그대로 적용됨 (예: "SV-P 020 PROMO").
  const queries = [];
  if (setLabel && numPart && rLabel) queries.push(`${setLabel} ${numPart} ${rLabel}`);
  if (setLabel && numPart) queries.push(`${setLabel} ${numPart}`);
  if (numPart && rLabel) queries.push(`${numPart} ${rLabel}`);
  if (numPart) queries.push(numPart);

  for (const q of queries) {
    const results = await searchSnkrdunk(q);
    const best = pickBestMatch(results, { cardNumber, totalNumber, setCode, rarity });
    trace.queries.push({
      q,
      count: results.length,
      topNames: results.slice(0, 5).map((r) => r.name),
      pickedScore: best?.score ?? null,
      pickedName: best?.item.name ?? null,
      pickedApparelId: best?.item.apparelId ?? null,
    });
    if (!best) continue;

    const apparel = await fetchApparel(best.item.apparelId);
    if (key) {
      cache[key] = { apparelId: best.item.apparelId, savedAt: new Date().toISOString() };
      saveCache().catch(() => {});
    }
    trace.pick = { source: 'search', q, apparelId: best.item.apparelId, score: best.score };
    return toResult(best.item.apparelId, apparel, best.item, false, trace);
  }

  return { miss: true, trace };
}

export const _internal = { searchSnkrdunk, fetchApparel, pickBestMatch, cacheKey };

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
 * Score search results for likely match. We require either an exact
 * `cardNumber/totalNumber` substring in the title (strong) or a `nameJa`
 * substring (weaker) — otherwise return null so we don't pick wildly off.
 *
 * For PROMO cards (setCode pattern like "m-p" / "l-p" / "sv-p"), the title
 * format is "[X-P NNN]" or "X-P NNN" instead of "NNN/TTT" — match either.
 *
 * @returns {{ item: object, score: number } | null}
 */
function pickBestMatch(results, { cardNumber, totalNumber, setCode, nameJa }) {
  if (!results || results.length === 0) return null;
  const cn = normalizeNum(cardNumber);
  const tn = normalizeNum(totalNumber);
  const isPromo = setCode && /^[a-z]+-p$/i.test(setCode);
  // Build patterns. For numeric totals: "22/165" tolerant of zero-padding.
  // For PROMO: "[M-P 020]" / "M-P 020" / "M-P020" / "M-P-020".
  const codePatterns = [];
  if (cn && tn && !isPromo) {
    const cnEsc = cn.replace(/(\d)/g, '0?$1');
    const tnEsc = tn.replace(/(\d)/g, '0?$1');
    codePatterns.push(new RegExp(`(^|[^\\d])${cnEsc}\\s*/\\s*${tnEsc}([^\\d]|$)`));
  }
  if (isPromo && cn) {
    const promo = String(setCode).toUpperCase();
    const cnPad = cn.padStart(3, '0').replace(/(\d)/g, '0?$1');
    codePatterns.push(new RegExp(`${promo}\\s*[-_ /]?\\s*${cnPad}\\b`, 'i'));
  }
  let best = null;
  let bestScore = -Infinity;
  for (const r of results) {
    let score = 0;
    for (const p of codePatterns) {
      if (p.test(r.name)) { score += 100; break; }
    }
    if (nameJa && r.name.includes(nameJa)) score += 50;
    if (r.priceText) score += 3;
    if (score > bestScore) {
      best = { item: r, score };
      bestScore = score;
    }
  }
  // Require at least name or code signal. Plain "has a price" isn't enough.
  if (bestScore < 50) return null;
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
 * Resolve snkrdunk info for an OCR result. Returns null when nothing
 * matches with sufficient confidence.
 *
 * @param {{
 *   cardNumber?: string,
 *   totalNumber?: string,
 *   setCode?: string,
 *   nameJa?: string,
 *   name?: string,
 * }} input
 */
export async function matchSnkrdunkForCard(input) {
  const { cardNumber, totalNumber, setCode, nameJa, name } = input ?? {};
  if (!cardNumber && !nameJa && !name) return null;

  const trace = {
    input: { cardNumber, totalNumber, setCode, nameJa, name },
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
  const codeStr = cn && tn && !isPromo ? `${cn}/${tn}` : '';
  // PROMO format: "M-P 020", which is how snkrdunk titles index promo cards.
  const promoStr = isPromo && cn ? `${String(setCode).toUpperCase()} ${cn.padStart(3, '0')}` : '';

  // Try the strongest queries first, stop on first confident hit.
  const queries = [];
  if (nameJa && promoStr) queries.push(`${nameJa} ${promoStr}`);
  if (nameJa && codeStr) queries.push(`${nameJa} ${codeStr}`);
  if (promoStr) queries.push(promoStr);
  if (codeStr) queries.push(codeStr);
  if (nameJa) queries.push(nameJa);
  if (name && !nameJa) queries.push(name);

  for (const q of queries) {
    const results = await searchSnkrdunk(q);
    const best = pickBestMatch(results, { cardNumber, totalNumber, setCode, nameJa });
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

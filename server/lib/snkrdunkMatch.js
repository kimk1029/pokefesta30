/**
 * Snkrdunk match — given OCR'd card fields (setCode + cardNumber/totalNumber
 * + optional rarity), find the matching snkrdunk apparel and return its
 * image + JPY price.
 *
 * Lookup order:
 *   1. disk cache (`setCode-cardNumber → apparelId`)
 *   2. 자체 카탈로그 DB (snkrdunk_cards — 시세확인 때 적재된 파싱 setCode/cardNumber)
 *   3. live snkrdunk search (공유 파서 fetchSnkrdunkSearch — /used/ 그리드 타일 포함)
 * 매칭 성공 시 카탈로그에 upsert 하므로 다음 스캔부터는 DB 에서 바로 잡힌다.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSnkrdunkSearch, fetchSnkrdunkApparel } from '@/lib/snkrdunk';
import { prisma } from './prisma.js';
import { upsertCatalogCard, recordPriceSnapshot } from './snkrdunkCatalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '..', 'data', 'snkrdunk-cache.json');

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
  if (cn && !tn && !isPromo) {
    // totalNumber 미인식 — "OP02-059" / "059/" 형태라도 번호 단독 매칭 허용.
    const cnEsc = cn.replace(/(\d)/g, '0?$1');
    codePatterns.push(new RegExp(`(^|[^\\d])${cnEsc}([^\\d]|$)`));
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
  // 단, totalNumber 없이 번호 단독 매칭만 된 경우 setCode 토큰도 같이 요구(+130).
  const tnMissing = cn && !tn && !isPromo;
  const threshold = tnMissing ? 130 : 100;
  if (bestScore < threshold) return null;
  return best;
}

function toResult(apparelId, apparel, searchItem, cacheHit, trace) {
  const imageUrl = apparel?.imageUrl ?? searchItem?.imageUrl ?? null;
  const priceJpy = apparel?.minPrice || null;
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

/** 매칭 성공한 apparel 을 카탈로그/시세 스냅샷에 적재 (fire-and-forget). */
function recordToCatalog(apparel) {
  if (!apparel) return;
  void upsertCatalogCard(apparel).catch(() => {});
  if (apparel.minPrice > 0) {
    void recordPriceSnapshot(apparel.id, {
      minPrice: apparel.minPrice,
      listingCount: apparel.listingCount ?? 0,
    }).catch(() => {});
  }
}

/**
 * 자체 카탈로그 DB 에서 setCode + cardNumber 로 카드 검색.
 * 시세확인/검색 때 본 카드는 여기서 바로 잡혀 라이브 검색 없이 매칭된다.
 * cardNumber 컬럼은 "059" 또는 "073/073" 형태 — 앞 번호만 비교.
 *
 * @returns {{ apparelId: number, imageUrl: string|null, name: string } | null}
 */
async function findInCatalog({ setCode, cardNumber, rarity }) {
  if (!setCode || !cardNumber) return null;
  const cn = normalizeNum(cardNumber);
  if (!cn) return null;
  try {
    const rows = await prisma.snkrdunkCard.findMany({
      where: {
        itemKind: 'single',
        setCode: { equals: String(setCode), mode: 'insensitive' },
      },
      take: 200,
    });
    const hits = rows.filter((r) => normalizeNum(String(r.cardNumber ?? '').split('/')[0]) === cn);
    if (hits.length === 0) return null;
    const rLabel = String(rarity ?? '').trim().toUpperCase();
    const byRarity = rLabel
      ? hits.find((r) => String(r.rarity ?? '').toUpperCase() === rLabel)
      : null;
    const hit = byRarity ?? hits[0];
    return {
      apparelId: hit.apparelId,
      imageUrl: hit.imageUrl ?? null,
      name: hit.koName || hit.localizedName || hit.name || '',
    };
  } catch (e) {
    console.warn('[snkrdunkMatch] catalog lookup failed:', e?.message ?? e);
    return null;
  }
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

  // 1) Cache hit — refresh price (apparel JSON is light) but skip the search.
  if (key && cache[key]?.apparelId) {
    const apparelId = cache[key].apparelId;
    const apparel = await fetchSnkrdunkApparel(apparelId);
    if (apparel) {
      trace.pick = { source: 'cache', apparelId, score: null };
      recordToCatalog(apparel);
      return toResult(apparelId, apparel, null, true, trace);
    }
    // Apparel disappeared from snkrdunk → drop the stale entry, fall through
    // to a fresh search.
    delete cache[key];
    saveCache().catch(() => {});
    trace.cacheKey = `${key} (stale)`;
  }

  // 2) 자체 카탈로그 DB — 시세확인 때 본 카드는 여기서 바로 매칭.
  const catalogHit = await findInCatalog({ setCode, cardNumber, rarity });
  if (catalogHit) {
    const apparel = await fetchSnkrdunkApparel(catalogHit.apparelId);
    trace.pick = { source: 'catalog', apparelId: catalogHit.apparelId, score: null };
    if (key) {
      cache[key] = { apparelId: catalogHit.apparelId, savedAt: new Date().toISOString() };
      saveCache().catch(() => {});
    }
    if (apparel) {
      recordToCatalog(apparel);
      return toResult(catalogHit.apparelId, apparel, null, false, trace);
    }
    // 라이브 조회 실패 — DB 에 저장된 이미지/이름으로라도 응답.
    return toResult(
      catalogHit.apparelId,
      null,
      { apparelId: catalogHit.apparelId, name: catalogHit.name, imageUrl: catalogHit.imageUrl, priceText: '' },
      false,
      trace,
    );
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

  // 3) Live search — 공유 파서 (시세확인 검색과 동일 — /used/ 그리드 타일 포함).
  // 쿼리 우선순위 — "setCode cn/tn rarity" 가 가장 강함. 폴백은 점진적으로 약한 조합.
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
    const results = await fetchSnkrdunkSearch(q);
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

    const apparel = await fetchSnkrdunkApparel(best.item.apparelId);
    if (key) {
      cache[key] = { apparelId: best.item.apparelId, savedAt: new Date().toISOString() };
      saveCache().catch(() => {});
    }
    trace.pick = { source: 'search', q, apparelId: best.item.apparelId, score: best.score };
    recordToCatalog(apparel);
    return toResult(best.item.apparelId, apparel, best.item, false, trace);
  }

  return { miss: true, trace };
}

export const _internal = { pickBestMatch, cacheKey, findInCatalog };

/**
 * Card-info lookup via TCGdex SDK.
 *
 * Why TCGdex over pokemontcg.io:
 *   - Better international coverage (Japanese-set cards = Korean-equivalent
 *     prints share the same set IDs: SV6, M1S, M3, etc.)
 *   - Prices included on the same response (cardmarket EUR + tcgplayer USD)
 *   - Free, no API key required
 *
 * Why we use the JA language:
 *   - TCGdex doesn't have Korean (`ko`) yet — flagged "Coming Soon".
 *   - Korean card prints mirror Japanese set codes 1:1 (m1L = M1L,
 *     SV6 = SV6, etc.), so JA returns the right card structure even when
 *     the Korean version is what the user scanned. We just override the
 *     name with whatever the OCR caught.
 *   - We fall back to EN when JA doesn't have the set (older / English-
 *     exclusive prints).
 *
 * The SDK's TypeScript types (Card$1) don't expose `pricing` yet, but the
 * REST response carries it — we read it off the raw object.
 *
 * @typedef {Object} TcgdexPricingSource
 * @property {number=} avg
 * @property {number=} low
 * @property {number=} trend
 * @property {number=} avg1
 * @property {number=} avg7
 * @property {number=} avg30
 * @property {string=} unit
 * @property {string=} updated
 * @property {number=} idProduct
 *
 * @typedef {Object} TcgdexPricing
 * @property {TcgdexPricingSource | null=} cardmarket
 * @property {TcgdexPricingSource | null=} tcgplayer
 *
 * @typedef {Object} LookupCardInput
 * @property {string} setCode
 * @property {string} cardNumber
 * @property {string=} totalNumber
 * @property {string=} rarity
 * @property {string=} name
 * @property {string=} language
 *
 * @typedef {Object} LookupResult
 * @property {'tcgdex-ja' | 'tcgdex-en' | 'local' | 'none'} source
 * @property {boolean} found
 * @property {object | null} card
 * @property {LookupCardInput} fields
 */

import TCGdex from '@tcgdex/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_DB = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'cards.json'), 'utf8'));

// Two language clients — Japanese covers all 2024-2025 Korean-equivalent
// sets; English is the fallback for older / English-only prints.
const tcgdexJa = new TCGdex('ja');
const tcgdexEn = new TCGdex('en');

/**
 * Search TCGdex JA by Pokémon Japanese name and return up to `limit` fully
 * enriched candidates (image, pricing, setName). Used as a fallback when the
 * exact setCode-number lookup misses (typical for AR/SAR cards beyond a
 * set's base count, which TCGdex hasn't ingested individually).
 *
 * Candidates whose `imageLarge` resolves to a 404 placeholder are dropped —
 * the UI promises image + price, so we don't surface stubs.
 *
 * @param {string} nameJa  Japanese katakana name (e.g. レアコイル)
 * @param {string=} preferredSetCode  When provided, cards in this set sort
 *                                    to the top.
 * @param {number=} limit
 * @returns {Promise<Array<object>>}
 */
export async function searchTcgdexByName(nameJa, preferredSetCode = '', limit = 5) {
  if (!nameJa) return [];
  let brief;
  try {
    // SDK's .query API is awkward — fall back to raw fetch with name=eq filter.
    const url = `https://api.tcgdex.net/v2/ja/cards?name=eq:${encodeURIComponent(nameJa)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    brief = await res.json();
  } catch {
    return [];
  }
  if (!Array.isArray(brief)) return [];

  // Sort: preferred set first, then by set-id desc (newer sets first).
  const wantedSet = (preferredSetCode ?? '').toLowerCase();
  brief.sort((a, b) => {
    const aMatch = String(a.id).toLowerCase().startsWith(wantedSet) ? 0 : 1;
    const bMatch = String(b.id).toLowerCase().startsWith(wantedSet) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return String(b.id).localeCompare(String(a.id));
  });

  const slice = brief.slice(0, limit);
  const fulls = await Promise.all(
    slice.map(async (b) => {
      const card = await safeFetch(tcgdexJa, b.id);
      return card ? normalizeCard(card, 'ja') : null;
    }),
  );
  // Drop entries without an image — the search-result UI promises image+price.
  return fulls.filter((c) => c && c.imageLarge);
}

/**
 * @param {LookupCardInput} input
 * @returns {Promise<LookupResult>}
 */
export async function lookupCard(input) {
  const fields = {
    setCode: String(input.setCode ?? '').toLowerCase().trim(),
    cardNumber: pad3(input.cardNumber),
    totalNumber: pad3(input.totalNumber),
    rarity: String(input.rarity ?? '').trim().toUpperCase(),
    name: String(input.name ?? '').trim(),
    language: String(input.language ?? '').trim().toLowerCase(),
  };

  // 1) TCGdex — primary source. Image + pricing only come from here. Try JA
  //    first (covers Korean-equivalent sets) then EN. 세트코드/번호 표기 차이를
  //    흡수하기 위해 후보 id 들을 만들어 첫 매칭을 쓴다.
  if (fields.setCode && fields.cardNumber) {
    const setCands = setCodeVariants(fields.setCode);
    const numCands = numberVariants(input.cardNumber);
    /** @type {{ card: any, langTag: 'tcgdex-ja' | 'tcgdex-en' } | null} */
    let hit = null;
    outer: for (const [client, langTag] of /** @type {Array<[TCGdex, 'tcgdex-ja' | 'tcgdex-en']>} */ ([
      [tcgdexJa, 'tcgdex-ja'],
      [tcgdexEn, 'tcgdex-en'],
    ])) {
      for (const sc of setCands) {
        for (const num of numCands) {
          const card = await safeFetch(client, `${sc}-${num}`);
          if (card) {
            hit = { card, langTag };
            break outer;
          }
        }
      }
    }
    if (hit) {
      {
        const card = hit.card;
        const langTag = hit.langTag;
        const normalized = normalizeCard(card, langTag === 'tcgdex-ja' ? 'ja' : 'en');
        // Merge: keep TCGdex data, but prefer the Korean name from local DB
        // when present (TCGdex doesn't have ko yet — JA/EN names are
        // Japanese/English).
        const local = LOCAL_DB.find(
          (c) => c.setCode === fields.setCode && c.number === fields.cardNumber,
        );
        if (local?.name) {
          normalized.localName = local.name;
          // Pure-Hangul OCR'd names are usually more useful in a Korean-app
          // context than the JP/EN one — surface both.
        }
        if (typeof local?.marketPrice === 'number' && !normalized.priceSummary) {
          // Local DB only carries KRW. Reverse-convert into EUR/USD/JPY so
          // the multi-region price block stays consistent.
          const krw = local.marketPrice;
          const eur = krw / FX.EUR_KRW;
          const usd = krw / FX.USD_KRW;
          const jpy = krw / (FX.EUR_KRW / FX.EUR_JPY); // KRW → JPY via EUR
          normalized.priceSummary = {
            source: 'local',
            value: krw,
            currency: 'KRW',
            low: null,
            trend: null,
            byRegion: {
              eur: Math.round(eur * 100) / 100,
              usd: Math.round(usd * 100) / 100,
              jpy: Math.round(jpy),
              krw: krw,
            },
          };
        }
        return { source: langTag, found: true, card: normalized, fields };
      }
    }
  }

  // 2) Local DB fallback — for cards TCGdex doesn't have (m1L, brand-new
  //    Korean exclusives, etc.).
  if (fields.setCode && fields.cardNumber) {
    const local = LOCAL_DB.find(
      (c) => c.setCode === fields.setCode && c.number === fields.cardNumber,
    );
    if (local) return { source: 'local', found: true, card: local, fields };
  }

  return { source: 'none', found: false, card: null, fields };
}

/**
 * SDK's card.get throws on 404; turn that into a null so the caller can
 * cascade through fallbacks.
 * @param {TCGdex} client
 * @param {string} cardId
 */
async function safeFetch(client, cardId) {
  try {
    const card = await client.card.get(cardId);
    return card ?? null;
  } catch (e) {
    // 404 / network errors are expected — only log unexpected failures.
    const msg = String(e?.message ?? e);
    if (!/404|not found|Endpoint or id/i.test(msg)) {
      console.warn(`[tcgdex] ${cardId} fetch failed:`, msg);
    }
    return null;
  }
}

/**
 * Convert TCGdex's full Card response into the shape the mobile app expects.
 * Surfaces pricing (cardmarket + tcgplayer) and a high-res image URL.
 * @param {any} card  Raw SDK response — TCGdex's typed Card$1 plus the
 *                    untyped `pricing` block returned by the REST API.
 * @param {'ja' | 'en'} lang
 */
function normalizeCard(card, lang) {
  // TCGdex sometimes has card metadata but NO image asset uploaded yet
  // (very new sets — m3 / m4 are commonly missing). In that case `card.image`
  // is undefined but the SDK still returns "undefined/high.png" from
  // getImageURL because it just template-concatenates. Treat any URL that
  // includes literal "undefined" as null so the mobile UI shows the user's
  // own photo instead of a 404 black box.
  const imageBase = typeof card.image === 'string' && card.image.length > 0 ? card.image : null;
  const isValid = (u) => typeof u === 'string' && u.length > 0 && !/^undefined|\/undefined/.test(u);
  const imageHigh = imageBase
    ? (typeof card.getImageURL === 'function'
        ? (isValid(safeImageURL(card, 'high', 'png')) ? safeImageURL(card, 'high', 'png') : safeImageURL(card, 'high', 'webp'))
        : `${imageBase}/high.webp`)
    : null;
  const imageLow = imageBase
    ? (typeof card.getImageURL === 'function'
        ? safeImageURL(card, 'low', 'webp')
        : `${imageBase}/low.webp`)
    : null;
  const finalHigh = isValid(imageHigh) ? imageHigh : null;
  const finalLow = isValid(imageLow) ? imageLow : null;

  /** @type {TcgdexPricing} */
  const pricing = card.pricing ?? {};
  const summary = priceSummary(pricing);

  return {
    id: card.id,
    name: card.name,
    setName: card?.set?.name,
    setCode: card?.set?.id,
    number: card.localId ?? '',
    totalNumber: card?.set?.cardCount?.official ?? card?.set?.cardCount?.total,
    rarity: card.rarity,
    illustrator: card.illustrator,
    hp: card.hp,
    types: card.types,
    stage: card.stage,
    description: card.description,
    attacks: card.attacks,
    weaknesses: card.weaknesses,
    retreat: card.retreat,
    imageSmall: finalLow,
    imageLarge: finalHigh,
    pricing,
    priceSummary: summary,
    sourceLang: lang,
  };
}

function safeImageURL(card, quality, format) {
  try {
    return card.getImageURL(quality, format) ?? null;
  } catch {
    return null;
  }
}

// Approximate FX rates as of 2026-05. Used to convert TCGdex's EUR / USD
// prices into JPY (Japan-equivalent market) and KRW (user-local) for
// display. These are static — the magnitudes are stable enough that a small
// drift doesn't matter for "this card is roughly worth X" UX. Override via
// env vars (FX_EUR_JPY etc.) if you want more accurate numbers.
const FX = {
  EUR_JPY: Number(process.env.FX_EUR_JPY ?? 165),
  EUR_KRW: Number(process.env.FX_EUR_KRW ?? 1500),
  USD_JPY: Number(process.env.FX_USD_JPY ?? 155),
  USD_KRW: Number(process.env.FX_USD_KRW ?? 1400),
};

/**
 * Pick the most useful headline price across cardmarket / tcgplayer. The
 * mobile UI usually only has space for one number — prefer cardmarket avg
 * (EUR) since JP-equivalent cards are stocked there; fall back to TCGplayer
 * market price for English prints.
 *
 * Also produces a `byRegion` block: same value rendered in EUR / USD / JPY /
 * KRW so the mobile UI can show European / North American / Japanese /
 * Korean estimated market prices without doing FX itself.
 *
 * @param {TcgdexPricing} pricing
 */
function priceSummary(pricing) {
  if (!pricing) return null;
  const cm = pricing.cardmarket;
  if (cm && typeof cm.avg === 'number') {
    return withRegions({
      source: 'cardmarket',
      value: cm.avg,
      currency: /** @type {'EUR'} */ ('EUR'),
      low: cm.low ?? null,
      trend: cm.trend ?? null,
    });
  }
  const tp = pricing.tcgplayer;
  if (tp && typeof tp === 'object') {
    // tcgplayer ships per-variant prices ({ normal: { market, low, ... }, holofoil: {...} })
    const variants = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionHolofoil'];
    for (const v of variants) {
      const slot = /** @type {any} */ (tp)[v];
      if (slot && typeof slot.market === 'number') {
        return withRegions({
          source: `tcgplayer:${v}`,
          value: slot.market,
          currency: /** @type {'USD'} */ ('USD'),
          low: slot.low ?? null,
          trend: null,
        });
      }
    }
  }
  return null;
}

/** Add EUR/USD/JPY/KRW columns to a priceSummary so the mobile UI can show
 *  market prices in any region without doing FX itself. */
function withRegions(summary) {
  const eur = summary.currency === 'EUR' ? summary.value : null;
  const usd = summary.currency === 'USD' ? summary.value : null;
  // Cross-rate from one anchor — pick whichever the source supplies.
  const jpy = eur != null ? eur * FX.EUR_JPY : usd != null ? usd * FX.USD_JPY : null;
  const krw = eur != null ? eur * FX.EUR_KRW : usd != null ? usd * FX.USD_KRW : null;
  return {
    ...summary,
    byRegion: {
      eur: eur,
      usd: usd,
      jpy: jpy != null ? Math.round(jpy) : null,
      krw: krw != null ? Math.round(krw) : null,
    },
  };
}

function pad3(n) {
  if (n === null || n === undefined) return '';
  const digits = String(n).replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.padStart(3, '0');
}

/**
 * 세트 코드 후보 생성. TCGdex 는 카탈로그/세트마다 표기가 달라서
 * (EN 기본세트는 2자리 zero-pad: sv1→sv01, sv8→sv08 / 변형세트는 sv4a 그대로)
 * 사용자가 친 코드 하나만으로는 자주 빗나간다. 알파접두사+숫자(+접미사) 패턴이면
 * 숫자부를 2자리 패딩한 변형과 패딩 제거 변형을 함께 시도한다.
 */
function setCodeVariants(raw) {
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return [];
  const out = new Set([s]);
  const m = s.match(/^([a-z]+)(\d+)([a-z0-9]*)$/);
  if (m) {
    const [, pre, num, suf] = m;
    out.add(`${pre}${num.padStart(2, '0')}${suf}`); // sv1 → sv01
    out.add(`${pre}${String(parseInt(num, 10))}${suf}`); // sv01 → sv1
  }
  return [...out];
}

/** 카드 번호 후보 — 3자리 zero-pad 와 패딩 제거(앞 0 제거) 둘 다 시도. */
function numberVariants(raw) {
  const out = new Set();
  const p = pad3(raw);
  if (p) {
    out.add(p); // 001
    out.add(String(parseInt(p, 10))); // 1
  }
  const t = String(raw ?? '').trim();
  if (t) out.add(t); // 사용자가 친 원본 (TG01 등 비숫자 케이스)
  return [...out].filter(Boolean);
}

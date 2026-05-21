/**
 * Extract structured fields from OCR text from the bottom-left card area.
 * Bottom-left typically reads like: "006/165 sv2a SR" or "044/185 s8b HR"
 * (set code is sometimes split or has stylization — be lenient).
 */
const RAR_TOKENS = ['SAR', 'SR', 'HR', 'RR', 'UR', 'AR', 'PROMO', 'C', 'U', 'R'];

// Korean rarity words → English token
const KR_RARITY_MAP = [
  [/슈퍼\s*아트\s*레어/, 'SAR'],
  [/슈퍼\s*레어/, 'SR'],
  [/하이퍼\s*레어/, 'HR'],
  [/더블\s*레어/, 'RR'],
  [/울트라\s*레어/, 'UR'],
  [/아트\s*레어/, 'AR'],
  [/프로모/, 'PROMO'],
  [/노멀/, 'C'],
  [/언커먼/, 'U'],
  [/레어/, 'R'],
];

// Mirrored from mobile/src/data/pokemonSetMap.ts. Lowercased so the
// case-insensitive parser hits — paddle returns "SV6" / "M3" / "Sv2a" and
// we normalize to lower before lookup.
const KNOWN_SETS = new Set([
  // Scarlet & Violet (Japanese / Korean prints share these IDs)
  'sv1s', 'sv1v', 'sv1a', 'sv2d', 'sv2p', 'sv2a',
  'sv3', 'sv3a', 'sv4k', 'sv4m', 'sv4a', 'sv5k', 'sv5m', 'sv5a',
  'sv6', 'sv6a', 'sv6e', 'sv7', 'sv7a', 'sv8', 'sv8a', 'sv9', 'sv9a',
  'sv10', 'sv11b', 'sv11w',
  // Sword & Shield era (s6a..s12a) — older Japanese sets still in circulation
  's6a', 's7', 's7a', 's7d', 's7r', 's8', 's8a', 's8b', 's9', 's10', 's10a',
  's10b', 's10p', 's11', 's11a', 's12', 's12a',
  // Sun & Moon era (sm1..sm12a)
  'sm1+', 'sm1m', 'sm1s', 'sm2+', 'sm2k', 'sm2l', 'sm3+', 'sm3h', 'sm3n',
  'sm4+', 'sm4a', 'sm4s', 'sm5+', 'sm5m', 'sm5s', 'sm6', 'sm6a', 'sm6b',
  'sm7', 'sm7a', 'sm7b', 'sm8', 'sm8a', 'sm8b', 'sm9', 'sm9a', 'sm9b',
  'sm10', 'sm10a', 'sm10b', 'sm11', 'sm11a', 'sm11b', 'sm12', 'sm12a',
  'smp2',
  // Sword & Shield English-block, kept for foreign card scans
  'swsh1', 'swsh2', 'swsh3', 'swsh4', 'swsh5', 'swsh6', 'swsh7', 'swsh8',
  'swsh9', 'swsh10',
  // Mega Evolution (2025+ KR/JP)
  'm1', 'm1l', 'm1s', 'm2', 'm2a', 'm3', 'm4',
]);

export function parseBottomLeft(text) {
  // Keep Korean characters in a separate cleaned-kr string for rarity matching.
  const original = text;
  const cleaned = text
    .replace(/[|/\\]/g, '/')
    .replace(/[^A-Za-z0-9/.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const numMatch = bestNumberMatch(cleaned);
  const cardNumber = numMatch?.cardNumber;
  const totalNumber = numMatch?.totalNumber;

  // set code — short alphanumeric token like "sv2a", "s8b", "swsh1". Must:
  //   1) Match a known set (strong) — accepted even without a cardNumber, OR
  //   2) Have 2+ letter prefix + at least 1 digit AND a cardNumber in the
  //      same ROI (without that gate, generic patterns are almost always OCR
  //      garbage like "x92" or "i1").
  let setCode = '';
  const codeText = normalizeSetCodeText(cleaned);
  const codeCandidates = [
    ...codeText.matchAll(/\b([a-zA-Z]{1,4}\d{1,3}[a-zA-Z]?)\b/g),
    ...codeText.matchAll(/\b(v\d{1,3}[a-zA-Z]?)\b/g),
  ].map((m) => m[1].replace(/^v/i, 'sv'));
  for (const c of codeCandidates) {
    if (KNOWN_SETS.has(c.toLowerCase())) { setCode = c.toLowerCase(); break; }
  }
  if (!setCode && cardNumber) {
    for (const c of codeCandidates) {
      const v = c.toLowerCase();
      if (/^(s\d|sv\d|sm\d|swsh\d)/.test(v) && v.length <= 6) {
        setCode = v;
        break;
      }
    }
  }

  // rarity — try Korean tokens first, then trailing letter after number,
  // then English standalone tokens.
  let rarity = '';
  for (const [pat, tok] of KR_RARITY_MAP) {
    if (pat.test(original)) { rarity = tok; break; }
  }
  if (!rarity) {
    // PaddleOCR often emits rarity glued to total: "022/063C" → "C".
    // Match a 1-3 letter run right after the number block.
    const glued = cleaned.toUpperCase().match(/\d{1,3}\s*\/\s*\d{1,3}\s*([A-Z]{1,3})\b/);
    if (glued && RAR_TOKENS.includes(glued[1])) rarity = glued[1];
  }
  if (!rarity) {
    const tokens = cleaned.toUpperCase().split(/\s+/);
    for (const r of RAR_TOKENS) {
      if (tokens.includes(r)) { rarity = r; break; }
    }
  }

  return { cardNumber, totalNumber, setCode, rarity, raw: cleaned };
}

// Common Pokémon TCG set sizes (Korean/Japanese releases). Tesseract often
// trims trailing digits ("/101" → "/10", "/165" → "/16") on stylized italic
// fonts; biasing toward known totals undoes that damage.
const KNOWN_TOTALS = new Set([
  60, 62, 63, 66, 68, 69, 70, 71, 72, 73, 75, 78, 81, 88, 92, 96, 98, 99, 100,
  101, 102, 105, 106, 108, 165, 166, 184, 185, 186, 187, 190, 198, 207,
  211, 230, 248, 249,
]);

function bestNumberMatch(text) {
  const numberText = normalizeNumberOcrText(text);
  // Also synthesize matches from standalone 6-digit runs — Tesseract often
  // drops the "/" on stylized italic, so "022/063" reads as "022063" /
  // "022088". Treating first3/last3 as card/total recovers the structure.
  const synthetic = [];
  for (const m of numberText.matchAll(/\d{6}/g)) {
    const s = m[0];
    synthetic.push([m[0], s.slice(0, 3), s.slice(3)]);
  }
  const raw = [
    ...numberText.matchAll(/([0-9A-Za-z]{1,6})\s*\/+\s*([0-9A-Za-z]{1,6})/g),
    // Space-separated fallback (when OCR drops the "/"). Skip when both sides
    // are identical — that happens when multi-pass OCR repeats the same
    // garbled string and isn't a real card/total pair.
    ...numberText.matchAll(/([0-9A-Za-z]{2,6})\s+([0-9A-Za-z]{2,6})/g),
    ...synthetic,
  ].filter((m) => m[1] !== m[2]);
  // Also surface variants where Tesseract joined the totalNumber with the next
  // word — e.g. "009 /10 GF" might actually be 009/101 if a "1" was misread.
  // We bonus matches whose total prefix matches a known set total to recover.
  const matches = raw
    .map((m) => {
      const rawCard = m[1];
      const rawTotal = m[2];
      const cardNumber = normalizeCardNumberToken(rawCard);
      const totalNumber = normalizeTotalNumberToken(rawTotal);
      const card = Number(cardNumber);
      const total = Number(totalNumber);
      let score = 0;
      // Bias toward realistic Pokémon set sizes; below 30 is almost
      // certainly OCR truncation (e.g. "/10" instead of "/101").
      if (total < 20) score -= 6;
      else if (total < 50) score -= 1;
      else if (total >= 50 && total <= 300) score += 5;
      if (KNOWN_TOTALS.has(total)) score += 6;
      if (card >= 1 && card <= 400) score += 3;
      if (card <= total || card <= total + 120) score += 2;
      if (rawCard.length >= 3) score += 1;
      if (String(rawTotal).replace(/\D/g, '').length >= 3) score += 2;
      if (String(rawTotal).replace(/\D/g, '').length > 3 && KNOWN_TOTALS.has(total)) score += 2;
      if (rawCard.length > 4) score -= 2;
      if (rawTotal.length > 4) score -= 2;
      return { cardNumber, totalNumber, score, rawCard, rawTotal };
    })
    .filter((m) => Number(m.cardNumber) > 0 && Number(m.totalNumber) > 0)
    .sort((a, b) => b.score - a.score);
  return matches[0] ?? null;
}

function normalizeNumberOcrText(s) {
  return String(s)
    // Common single-character OCR slips in the tiny italic number row.
    .replace(/[Oo]/g, '0')
    .replace(/[Il]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');
}

function normalizeCardNumberToken(s) {
  const digits = String(s).replace(/\D/g, '');
  // OCR often prepends junk digits to stylized text, e.g. 2071/4101 for
  // 071/101. Card numbers in modern Pokemon sets are usually 3 digits.
  return digits.length > 3 ? digits.slice(-3) : digits;
}

function normalizeTotalNumberToken(s) {
  const digits = String(s).replace(/\D/g, '');

  // Fuzzy recovery: italic Pokémon TCG digits 6/3/8 collapse into each other
  // under Tesseract. If the literal read isn't in KNOWN_TOTALS but a swap of
  // 8↔3 / 8↔6 / 8↔0 lands on one, prefer the swap.
  const candidates = new Set();
  const seed = (d) => candidates.add(d);
  if (digits.length <= 3) seed(digits);
  if (digits.length >= 3) {
    seed(digits.slice(0, 3));
    seed(digits.slice(-3));
    seed(digits.slice(0, 3).replace(/^0+/, ''));
    seed(digits.slice(-3).replace(/^0+/, ''));
  }
  // Fan out 8↔3 / 8↔6 swaps. Each "8" in OCR could really be 3 or 6; try
  // every combination and keep ones that land on a known total.
  for (const c of [...candidates]) {
    for (const swap of digitSwapVariants(c)) candidates.add(swap);
  }

  let best = null;
  for (const c of candidates) {
    if (!c) continue;
    const n = Number(c);
    if (!Number.isFinite(n) || n <= 0) continue;
    let score = 0;
    if (KNOWN_TOTALS.has(n)) score += 10;
    if (n >= 50 && n <= 300) score += 3;
    if (c === digits || c === digits.slice(-3) || c === digits.slice(0, 3)) score += 1; // prefer literal read on tie
    if (!best || score > best.score) best = { value: c, score };
  }
  if (best) return best.value;
  return digits.length <= 3 ? digits : digits.slice(-3);
}

/** Generate up to 16 swap variants for short strings — each "8" / "3" / "6"
 *  / "0" swapped against each other (italic OCR confusion). Capped to keep
 *  the candidate explosion small. */
function digitSwapVariants(s) {
  const out = new Set();
  if (!s || s.length > 4) return out;
  const swaps = { '8': ['3', '6', '0'], '3': ['8'], '6': ['8'], '0': ['8'] };
  const recurse = (str, idx) => {
    if (out.size > 24) return;
    if (idx >= str.length) { out.add(str); return; }
    recurse(str, idx + 1);
    const ch = str[idx];
    for (const r of swaps[ch] ?? []) {
      const next = str.slice(0, idx) + r + str.slice(idx + 1);
      recurse(next, idx + 1);
    }
  };
  recurse(s, 0);
  out.delete(s);
  return out;
}

function normalizeSetCodeText(s) {
  return s
    .toLowerCase()
    .replace(/\b5v/g, 'sv')
    .replace(/\bsu/g, 'sv')
    .replace(/\bsvb\b/g, 'sv6')
    .replace(/\bsvo\b/g, 'sv6')
    .replace(/\bsvq\b/g, 'sv9')
    // OCR reads the digit "1" inside short set codes as "i" or "l" — restore.
    // mil / mll → m1l, mil → m1l, sm1la → sm11a (etc).
    .replace(/\bm[il]l\b/g, 'm1l')
    .replace(/\bm[il]\b/g, 'm1');
}

export function cleanName(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length >= 2)
    .slice(0, 1)[0] ?? '';
}

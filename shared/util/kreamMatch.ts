/**
 * KREAM 검색 결과 매칭 — 웹/모바일 공용.
 *
 * KREAM 은 포켓몬 카드도 일반 상품처럼 "이름"으로만 검색돼, 같은 포켓몬의 여러 카드가
 * 섞여 나온다(예: "리자몽"으로 검색하면 세트·번호·등급이 다른 리자몽이 전부 노출).
 * 이름 토큰만으로 1등을 고르면 엉뚱한 카드가 잡히므로, SNKRDUNK 카드의
 * setCode / cardNumber / rarity(등급) 힌트로 결과를 검증·선별한다.
 *
 * 정확도 우선: 힌트가 있는데 어떤 결과도 그 힌트를 하나도 만족하지 못하면
 * "매칭 없음(null)"을 반환한다 — 틀린 가격을 보여주느니 폴백 링크가 낫다.
 *
 * cardSearchJa(번역 사전)처럼 양쪽에서 복제하지 말 것. 여기 한 곳만 고친다.
 */

export interface KreamItemLite {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  productUrl: string;
}

export interface KreamHints {
  /** 콜렉터 번호 좌측값 (예: "059/165" → "059"). */
  cardNumber?: string | null;
  /** 세트 코드 (예: "SV2A", "OP02"). */
  setCode?: string | null;
  /** 등급 토큰 (예: "SAR", "SR"). */
  rarity?: string | null;
}

// 긴 토큰 먼저(SAR > AR, MUR > UR). cardRarity.ts 와 동일 셋 — 의존 없이 자체 보유.
const RARITY_TOKENS = ['MUR', 'CSR', 'SAR', 'CHR', 'HR', 'UR', 'SR', 'RR', 'MA', 'AR'];

function stripZeros(s: string): string {
  return s.replace(/^0+/, '') || '0';
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 영문/숫자 토큰을 단어 경계로 포함하는지 (한글·일본어·괄호 사이에 낀 토큰 캐치). */
function hasToken(upperText: string, token: string): boolean {
  let idx = 0;
  const t = token.toUpperCase();
  while ((idx = upperText.indexOf(t, idx)) !== -1) {
    const before = upperText[idx - 1];
    const after = upperText[idx + t.length];
    const bAlnum = before ? /[A-Z0-9]/.test(before) : false;
    const aAlnum = after ? /[A-Z0-9]/.test(after) : false;
    if (!bAlnum && !aAlnum) return true;
    idx += t.length;
  }
  return false;
}

/**
 * SNKRDUNK 카드명/상품번호 등에서 setCode / cardNumber / rarity 힌트를 추출.
 * 여러 텍스트(일본어명, 한국어명, productNumber)를 함께 넘기면 합쳐서 파싱한다.
 */
export function parseKreamHints(...texts: Array<string | null | undefined>): KreamHints {
  const joined = texts.filter(Boolean).join(' ');
  const upper = joined.toUpperCase();

  // 등급 — 가장 긴 토큰부터 단어 경계로.
  let rarity: string | null = null;
  for (const tok of RARITY_TOKENS) {
    if (hasToken(upper, tok)) {
      rarity = tok;
      break;
    }
  }

  // 콜렉터 번호 — "059/165", "201 / SV-P" 형태의 좌측값.
  const numMatch = joined.match(/(\d{1,3})\s*\/\s*[0-9A-Za-z-]{1,6}/);
  const cardNumber = numMatch ? numMatch[1] : null;

  // 세트 코드 — SV2a / S12a / SM12 / OP02 / XY12 등.
  const setMatch = upper.match(/\b(S[VM]\d{1,2}[A-Z]?|S\d{1,2}[A-Z]?|OP\d{2}|XY\d{1,2})\b/);
  const setCode = setMatch ? setMatch[1] : null;

  return { cardNumber, setCode, rarity };
}

/** 결과 이름이 콜렉터 번호를 (앞자리 0 무시) 포함하는지. */
function nameHasNumber(name: string, cn: string): boolean {
  const groups = name.match(/\d{1,4}/g) || [];
  return groups.some((g) => stripZeros(g) === cn);
}

interface Scored {
  item: KreamItemLite;
  score: number;
  /** setCode/cardNumber/rarity 중 하나라도 검증됐는지. */
  strong: boolean;
}

function scoreItem(it: KreamItemLite, tokens: string[], hints: KreamHints): Scored {
  const n = norm(it.name);
  const up = it.name.toUpperCase();
  let score = 0;
  let strong = false;

  for (const t of tokens) if (n.includes(norm(t))) score += 1;

  const cn = hints.cardNumber ? stripZeros(hints.cardNumber) : null;
  if (cn && nameHasNumber(it.name, cn)) {
    score += 4;
    strong = true;
  }
  if (hints.rarity && hasToken(up, hints.rarity)) {
    score += 2;
    strong = true;
  }
  if (hints.setCode && hasToken(up, hints.setCode)) {
    score += 2;
    strong = true;
  }
  if (it.price > 0) score += 0.5; // 가격 있는 매물 우대

  return { item: it, score, strong };
}

/**
 * 검색 결과에서 카드와 가장 잘 맞는 항목을 선택.
 * 힌트(setCode/cardNumber/rarity)가 있으면 그걸 검증한 항목만 후보로 두고,
 * 어떤 항목도 검증하지 못하면 null(매칭 없음).
 * 힌트가 전혀 없으면 기존처럼 이름 토큰 점수로 1등을 고른다.
 */
export function bestKreamMatch(
  items: KreamItemLite[],
  query: string,
  hints?: KreamHints,
): KreamItemLite | null {
  if (items.length === 0) return null;
  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  const h: KreamHints = hints ?? {};
  const haveHints = !!(h.cardNumber || h.setCode || h.rarity);

  const scored = items.map((it) => scoreItem(it, tokens, h));
  const pool = haveHints ? scored.filter((s) => s.strong) : scored;
  if (pool.length === 0) return null; // 힌트 있는데 검증된 결과 없음 → 폴백

  let best = pool[0];
  for (const s of pool) if (s.score > best.score) best = s;
  return best.item;
}

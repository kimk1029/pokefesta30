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
  /** 이름에 포함된 query 토큰 수 (폴백 매칭 임계용). */
  nameHits: number;
}

function scoreItem(it: KreamItemLite, tokens: string[], hints: KreamHints): Scored {
  const n = norm(it.name);
  const up = it.name.toUpperCase();
  let score = 0;
  let strong = false;
  let nameHits = 0;

  for (const t of tokens) {
    if (n.includes(norm(t))) {
      score += 1;
      nameHits += 1;
    }
  }

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

  return { item: it, score, strong, nameHits };
}

/**
 * 검색 결과에서 카드와 가장 잘 맞는 항목을 선택.
 *
 * 2단계:
 *   ① 강한 매칭 우선 — setCode/cardNumber/rarity 중 하나라도 검증된 항목이 있으면
 *      그 중 점수 1등. (가장 정확)
 *   ② 강한 매칭이 없으면 이름 매칭으로 폴백 — query 토큰을 충분히(2토큰 이상 질의는
 *      최소 2개) 포함하는 매물 중 점수 1등. KREAM 상품명은 서술형 한글명이라
 *      번호/세트코드를 거의 안 담으므로, ①만 고집하면 멀쩡한 카드도 못 잡는다.
 *      (점수에 rarity/setCode 부분일치 가산이 있어 폴백도 같은 등급을 우선한다.)
 *   둘 다 실패하면 null.
 */
export function bestKreamMatch(
  items: KreamItemLite[],
  query: string,
  hints?: KreamHints,
): KreamItemLite | null {
  if (items.length === 0) return null;
  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  const h: KreamHints = hints ?? {};

  const scored = items.map((it) => scoreItem(it, tokens, h));
  const pickBest = (arr: Scored[]): KreamItemLite =>
    arr.reduce((a, b) => (b.score > a.score ? b : a)).item;

  // ① 강한 매칭(번호/세트/등급 검증)
  const strong = scored.filter((s) => s.strong);
  if (strong.length > 0) return pickBest(strong);

  // ② 이름 매칭 폴백 — 최소 토큰 수 충족 + 가격 있는 매물만.
  const minHits = tokens.length >= 2 ? 2 : 1;
  const named = scored.filter((s) => s.nameHits >= minHits && s.item.price > 0);
  if (named.length > 0) return pickBest(named);

  return null;
}

/* ── 세트코드+번호 검색 (정확) ──────────────────────────────────── */

/**
 * KREAM 검색 키워드를 만든다.
 * setCode + cardNumber 가 있으면 "sv11b 054" 처럼 코드로 검색 — KREAM 이 내부
 * 메타로 정확한 카드만 필터해 변형(언어/미러)만 남는다(이름 매칭보다 훨씬 정확).
 * 없으면 카드명으로 폴백.
 */
export function kreamSearchQuery(
  hints: KreamHints,
  fallbackName: string,
): { q: string; byCode: boolean } {
  const num = hints.cardNumber ? hints.cardNumber.split('/')[0].trim() : '';
  if (hints.setCode && num) return { q: `${hints.setCode} ${num}`, byCode: true };
  return { q: fallbackName, byCode: false };
}

/**
 * 코드(setCode+번호)로 검색한 결과에서 1건 선별.
 * 결과는 이미 그 카드로 한정돼 있으니 이름 토큰 매칭 대신:
 *   ① 가격 있는 매물 → ② rarity 일치 우선 → ③ 기본판 우선(미러/특수볼/리버스 변형 뒤로).
 * KREAM 관련도 순서를 유지하므로 후보 중 첫 항목이 보통 정본.
 */
const VARIANT_RE = /(미러|마스터볼|몬스터볼|리버스|mirror|reverse)/i;

export function pickKreamByCode(items: KreamItemLite[], hints: KreamHints): KreamItemLite | null {
  const priced = items.filter((it) => it.price > 0);
  let pool = priced.length > 0 ? priced : items;
  if (pool.length === 0) return null;

  if (hints.rarity) {
    const up = hints.rarity.toUpperCase();
    const m = pool.filter((it) => hasToken(it.name.toUpperCase(), up));
    if (m.length > 0) pool = m;
  }
  const base = pool.filter((it) => !VARIANT_RE.test(it.name));
  return (base.length > 0 ? base : pool)[0];
}

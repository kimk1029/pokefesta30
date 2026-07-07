/**
 * PSA 인구 리포트(Population Report) — 공식 Public API 연동.
 *   GET https://api.psacard.com/publicapi/cert/GetByCertNumber/{cert}
 *   GET https://api.psacard.com/publicapi/pop/GetPSASpecPopulation/{specId}
 *   헤더: Authorization: bearer {PSA_API_TOKEN}
 *
 * PSA 무료 API 는 카드 검색이 없어 SpecID 를 직접 찾을 수 없다 — cert 번호
 * (슬랩 라벨의 인증번호) 1건을 조회하면 그 카드의 SpecID 가 나오므로,
 * "cert 1회 등록 → setCode+카드번호 ↔ SpecID 매핑 저장 → 이후 pop 갱신" 구조.
 *
 * 쿼터: 무료 계정 일 100콜 — pop 은 7일 TTL 로 psa_specs 에 캐시하고,
 * 프로세스 내 일일 카운터(PSA_DAILY_LIMIT, 기본 80)로 호출을 억제한다.
 * 원본 응답(popRaw)을 보존해 파서가 틀려도 재호출 없이 보정 가능.
 */
import { prisma } from './prisma.js';

const PSA_ORIGIN = 'https://api.psacard.com/publicapi';
/** pop 은 느리게 변함 + 쿼터 보호 — 7일 캐시. */
const POP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_LIMIT = Math.max(1, Number(process.env.PSA_DAILY_LIMIT ?? 80));

function apiToken(): string | null {
  const t = process.env.PSA_API_TOKEN;
  return t && t.trim() ? t.trim() : null;
}

export function psaEnabled(): boolean {
  return apiToken() !== null;
}

/* ── 일일 쿼터 (프로세스 내 카운터 — 재시작 시 리셋, PSA 서버가 최종 강제) ── */
let quotaDay = '';
let quotaUsed = 0;

function underQuota(): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== quotaDay) {
    quotaDay = day;
    quotaUsed = 0;
  }
  return quotaUsed < DAILY_LIMIT;
}

/**
 * PSA 의 Cloudflare 가 한국 홈 IP(NAS 회선)를 하드 차단해 직접 호출이 403 —
 * Vercel 웹앱의 /api/psa-relay(미국 egress) 를 경유하는 폴백.
 * PSA_RELAY_ORIGIN 기본값은 운영 웹 도메인. 빈 문자열로 두면 폴백 비활성.
 */
const RELAY_ORIGIN = (process.env.PSA_RELAY_ORIGIN ?? 'https://www.poke-30.com').trim();
/** 직접 호출이 차단으로 판명되면 이후 호출은 곧장 릴레이로 (프로세스 생존 동안). */
let directBlocked = false;

async function fetchViaRelay(path: string, tok: string): Promise<unknown | null> {
  if (!RELAY_ORIGIN) return null;
  try {
    const headers: Record<string, string> = { 'x-psa-token': tok, Accept: 'application/json' };
    const relayKey = process.env.PSA_RELAY_KEY;
    if (relayKey) headers['x-relay-key'] = relayKey;
    const res = await fetch(`${RELAY_ORIGIN}/api/psa-relay?path=${encodeURIComponent(path)}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error('[psa] relay non-OK', res.status, path);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[psa] relay fetch failed', path, err);
    return null;
  }
}

async function fetchPsaJson(path: string): Promise<unknown | null> {
  const tok = apiToken();
  if (!tok) return null;
  if (!underQuota()) {
    console.warn('[psa] daily quota reached — skipping', path);
    return null;
  }
  quotaUsed += 1;
  if (!directBlocked) {
    try {
      const res = await fetch(`${PSA_ORIGIN}${path}`, {
        headers: { Authorization: `bearer ${tok}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return await res.json();
      console.error('[psa] non-OK', res.status, path);
      // 403 = Cloudflare IP 차단 가능성 — 릴레이로 전환. 그 외(401 등)는 토큰 문제라 그대로 실패.
      if (res.status !== 403) return null;
      directBlocked = true;
    } catch (err) {
      console.error('[psa] direct fetch failed — trying relay', path, err);
    }
  }
  return fetchViaRelay(path, tok);
}

/* ── 매핑 키 ─────────────────────────────────────────────────────── */

/** "SV2A" + "059/165" → "sv2a:59" — 선행 0 제거한 좌측 번호로 정규화. */
export function psaCardKey(setCode: string, cardNumber: string): string {
  const left = cardNumber.split('/')[0] ?? cardNumber;
  const num = (left.match(/\d+/)?.[0] ?? left).replace(/^0+/, '') || '0';
  return `${setCode.trim().toLowerCase()}:${num}`;
}

function numDigits(s: string | null | undefined): string {
  return ((s ?? '').split('/')[0].match(/\d+/)?.[0] ?? '').replace(/^0+/, '');
}

/* ── cert 조회 ───────────────────────────────────────────────────── */

export interface PsaCertInfo {
  certNumber: string;
  specId: number;
  subject: string;
  brand: string;
  year: string;
  variety: string;
  cardNumber: string;
  cardGrade: string;
  totalPopulation: number;
}

export async function fetchCertInfo(certNumber: string): Promise<PsaCertInfo | null> {
  const raw = await fetchPsaJson(`/cert/GetByCertNumber/${encodeURIComponent(certNumber)}`);
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const c = (o.PSACert ?? o.psaCert ?? raw) as Record<string, unknown>;
  const specId = Number(c?.SpecID ?? c?.SpecId ?? c?.specID ?? 0);
  if (!c || !Number.isFinite(specId) || specId <= 0) return null;
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
  return {
    certNumber: str(c.CertNumber) || certNumber,
    specId,
    subject: str(c.Subject),
    brand: str(c.Brand),
    year: str(c.Year),
    variety: str(c.Variety),
    cardNumber: str(c.CardNumber),
    cardGrade: str(c.CardGrade ?? c.GradeDescription),
    totalPopulation: Number(c.TotalPopulation ?? 0) || 0,
  };
}

/* ── pop 조회 + 관대한 정규화 ────────────────────────────────────── */

export interface PsaGradeRow {
  /** PSA 표기 라벨 (예: "GEM MT 10"). */
  label: string;
  /** 숫자 등급 (10, 9.5, 9 …) — 파싱 실패 시 null. */
  grade: number | null;
  pop: number;
  /** 퀄리파이어(OC 등) 포함분. */
  popQ: number;
}

function pickNum(o: Record<string, unknown>, re: RegExp, exclude?: RegExp): number | null {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== 'number') continue;
    if (exclude && exclude.test(k)) continue;
    if (re.test(k)) return v;
  }
  return null;
}

/** 배열 형태 응답 → 등급 행. 요소가 grade/population 꼴이 아니면 null. */
function rowsFromArray(arr: unknown[]): PsaGradeRow[] | null {
  const rows: PsaGradeRow[] = [];
  for (const el of arr) {
    if (!el || typeof el !== 'object') return null;
    const o = el as Record<string, unknown>;
    const pop = pickNum(o, /^pop(ulation)?(count)?$/i) ?? pickNum(o, /population/i, /qualifier|higher|plus|total/i);
    if (pop == null) return null;
    let label = '';
    let grade: number | null = null;
    for (const [k, v] of Object.entries(o)) {
      if (/grade/i.test(k) && typeof v === 'string' && v.trim() && !label) label = v.trim();
      if (/grade/i.test(k) && typeof v === 'number' && grade == null) grade = v;
    }
    if (grade == null) {
      const m = label.match(/(\d+(?:\.\d)?)\s*$/);
      if (m) grade = Number(m[1]);
    }
    if (!label && grade != null) label = String(grade);
    rows.push({
      label,
      grade,
      pop,
      popQ: pickNum(o, /qualifier/i) ?? 0,
    });
  }
  return rows.some((r) => r.pop > 0 || r.grade != null) ? rows : null;
}

/** 평면 객체 형태 응답 ({Grade10: n, Grade9: n, …}) → 등급 행. */
function rowsFromFlat(o: Record<string, unknown>): PsaGradeRow[] | null {
  const rows: PsaGradeRow[] = [];
  for (const [k, v] of Object.entries(o)) {
    const m = k.match(/^grade[_\s]?(\d+(?:[._]5)?)$/i);
    if (!m || typeof v !== 'number') continue;
    const grade = Number(m[1].replace('_', '.'));
    rows.push({ label: `PSA ${grade}`, grade, pop: v, popQ: 0 });
  }
  const auth = pickNum(o, /^(auth|authentic)$/i);
  if (auth != null) rows.push({ label: 'AUTH', grade: 0, pop: auth, popQ: 0 });
  return rows.length >= 3 ? rows : null;
}

/** 응답 트리를 얕게 순회하며 등급 배열/평면 객체를 찾는다 (스키마 방어). */
function findGradeRows(raw: unknown, depth = 0): PsaGradeRow[] | null {
  if (depth > 4 || !raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) return rowsFromArray(raw);
  const o = raw as Record<string, unknown>;
  const flat = rowsFromFlat(o);
  if (flat) return flat;
  for (const v of Object.values(o)) {
    const found = findGradeRows(v, depth + 1);
    if (found) return found;
  }
  return null;
}

function findTotal(raw: unknown, rows: PsaGradeRow[]): number {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const direct = pickNum(raw as Record<string, unknown>, /total/i, /qualifier/i);
    if (direct != null && direct > 0) return direct;
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const nested = pickNum(v as Record<string, unknown>, /total/i, /qualifier/i);
        if (nested != null && nested > 0) return nested;
      }
    }
  }
  return rows.reduce((a, r) => a + r.pop + r.popQ, 0);
}

export async function fetchSpecPop(
  specId: number,
): Promise<{ rows: PsaGradeRow[] | null; total: number; raw: unknown } | null> {
  const raw = await fetchPsaJson(`/pop/GetPSASpecPopulation/${specId}`);
  if (!raw) return null;
  const rows = findGradeRows(raw);
  if (!rows) console.warn('[psa] pop 파싱 실패 — popRaw 만 저장', specId);
  return { rows, total: rows ? findTotal(raw, rows) : 0, raw };
}

/* ── DB 캐시 (psa_specs) ─────────────────────────────────────────── */

export interface PsaPopResult {
  specId: number;
  certNumber: string;
  subject: string;
  brand: string;
  year: string;
  variety: string;
  total: number;
  grades: PsaGradeRow[];
  fetchedAt: string;
}

type PsaSpecRow = NonNullable<Awaited<ReturnType<typeof prisma.psaSpec.findUnique>>>;

function toResult(row: PsaSpecRow): PsaPopResult {
  return {
    specId: row.specId,
    certNumber: row.certNumber,
    subject: row.subject,
    brand: row.brand,
    year: row.year,
    variety: row.variety,
    total: row.popTotal,
    grades: Array.isArray(row.grades) ? (row.grades as unknown as PsaGradeRow[]) : [],
    fetchedAt: (row.popFetchedAt ?? row.updatedAt).toISOString(),
  };
}

/** spec pop 재조회 → 행 갱신. 실패 시 null (호출부는 기존 캐시 사용). */
async function refreshSpecPop(rowId: number, specId: number): Promise<PsaSpecRow | null> {
  const pop = await fetchSpecPop(specId);
  if (!pop) return null;
  try {
    return await prisma.psaSpec.update({
      where: { id: rowId },
      data: {
        grades: pop.rows ?? undefined,
        popTotal: pop.total,
        popRaw: pop.raw as object,
        popFetchedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[psa] refresh 저장 실패', specId, err);
    return null;
  }
}

/** 카드(setCode+번호)의 캐시된 pop. 매핑 없으면 null, TTL 지나면 갱신 시도 후 스테일 폴백. */
export async function getPopForCard(
  setCode: string,
  cardNumber: string,
): Promise<PsaPopResult | null> {
  const key = psaCardKey(setCode, cardNumber);
  const row = await prisma.psaSpec.findUnique({ where: { cardKey: key } });
  if (!row) return null;
  const stale = !row.popFetchedAt || Date.now() - row.popFetchedAt.getTime() > POP_TTL_MS;
  if (stale && psaEnabled()) {
    const fresh = await refreshSpecPop(row.id, row.specId);
    if (fresh) return toResult(fresh);
  }
  return toResult(row);
}

/**
 * cert 번호 1건으로 카드 ↔ SpecID 매핑 등록 + pop 적재.
 * cert 의 카드번호와 요청 카드번호가 다르면 오등록으로 보고 거절.
 */
export async function registerCertForCard(
  certNumber: string,
  setCode: string,
  cardNumber: string,
): Promise<{ ok: true; pop: PsaPopResult } | { ok: false; reason: 'disabled' | 'cert-not-found' | 'number-mismatch' | 'save-failed' }> {
  if (!psaEnabled()) return { ok: false, reason: 'disabled' };
  const cert = await fetchCertInfo(certNumber);
  if (!cert) return { ok: false, reason: 'cert-not-found' };

  const certNum = numDigits(cert.cardNumber);
  const reqNum = numDigits(cardNumber);
  if (certNum && reqNum && certNum !== reqNum) return { ok: false, reason: 'number-mismatch' };

  const pop = await fetchSpecPop(cert.specId);
  const base = {
    setCode: setCode.trim(),
    cardNumber: cardNumber.trim(),
    specId: cert.specId,
    certNumber: cert.certNumber,
    subject: cert.subject,
    variety: cert.variety,
    brand: cert.brand,
    year: cert.year,
    // pop 조회 실패 시에도 cert 의 스펙 총 pop 은 확보 — grades 는 다음 갱신에서.
    grades: pop?.rows ?? undefined,
    popTotal: pop?.total || cert.totalPopulation,
    popRaw: (pop?.raw as object) ?? undefined,
    popFetchedAt: new Date(),
  };
  try {
    const row = await prisma.psaSpec.upsert({
      where: { cardKey: psaCardKey(setCode, cardNumber) },
      create: { cardKey: psaCardKey(setCode, cardNumber), ...base },
      update: base,
    });
    return { ok: true, pop: toResult(row) };
  } catch (err) {
    console.error('[psa] 매핑 저장 실패', certNumber, err);
    return { ok: false, reason: 'save-failed' };
  }
}

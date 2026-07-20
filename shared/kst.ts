/**
 * KST(Asia/Seoul) 날짜 유틸 — 웹·모바일·NAS 서버 공유 단일 소스.
 * KST 는 DST 가 없어 고정 +9h 산술로 충분하다 (Intl 불필요, RN 호환).
 *
 * 기존에 navercafe.ts / me.ts / checkIn.ts / dailyPriceSnapshot.ts /
 * marketplace.ts 가 제각각 재구현하던 것을 통합.
 */

export const KST_OFFSET_MS = 9 * 3_600_000;

const DAY_MS = 86_400_000;

function toMs(t: number | Date): number {
  return typeof t === 'number' ? t : t.getTime();
}

/** KST 기준 연·월·일. */
export function kstDateParts(now: number | Date = Date.now()): { y: number; m: number; d: number } {
  const kst = new Date(toMs(now) + KST_OFFSET_MS);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate() };
}

/** KST 기준 일자 키 'YYYY-MM-DD'. 일별 스냅샷/집계 키. */
export function kstDateKey(now: number | Date = Date.now()): string {
  const { y, m, d } = kstDateParts(now);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** kstDateKey 의 'daysBack 일 전' 일자 키. */
export function kstDateKeyShifted(daysBack: number, now: number | Date = Date.now()): string {
  return kstDateKey(toMs(now) - daysBack * DAY_MS);
}

/** now 가 속한 KST 달력일의 00:00 (epoch ms). */
export function kstDayStartMs(now: number | Date = Date.now()): number {
  return Math.floor((toMs(now) + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
}

/** now 가 속한 KST 달력일의 00:00 (Date). */
export function kstDayStart(now: number | Date = Date.now()): Date {
  return new Date(kstDayStartMs(now));
}

/** 두 시각이 KST 기준 같은 달력일인지. */
export function isSameKstDay(a: number | Date, b: number | Date = Date.now()): boolean {
  const ta = toMs(a);
  if (!ta) return false;
  return kstDayStartMs(ta) === kstDayStartMs(b);
}

/** KST 달력일 차이 (a - b, 일 단위 정수). */
export function kstDayDiff(a: number | Date, b: number | Date): number {
  return Math.round((kstDayStartMs(a) - kstDayStartMs(b)) / DAY_MS);
}

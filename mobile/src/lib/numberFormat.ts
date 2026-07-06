/**
 * 가격/숫자 UI 포맷 — 웹 src/lib/numberFormat.ts 와 1:1 동기화.
 * 문자열 안의 4자리 이상 연속 숫자 런(run)에 천단위 콤마 삽입.
 */
export function formatPrice(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  // 기존 콤마 있으면 한번 제거 후 재포맷 (중복 방지)
  const stripped = s.replace(/(\d),(?=\d{3})/g, '$1');
  return stripped.replace(/\d{4,}/g, (digits) => Number(digits).toLocaleString('ko-KR'));
}

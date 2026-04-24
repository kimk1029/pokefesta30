/**
 * 가격/숫자 UI 포맷. 순수 숫자면 천단위 콤마, 그 외는 원문 유지.
 * 예: "15000" → "15,000"  /  "제안" → "제안"  /  "1.5만" → "1.5만"
 */
export function formatPrice(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  const digits = s.replace(/,/g, '');
  if (/^\d+$/.test(digits)) {
    return Number(digits).toLocaleString('ko-KR');
  }
  return s;
}

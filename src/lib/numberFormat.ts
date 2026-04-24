/**
 * 가격/숫자 UI 포맷.
 * 문자열 안의 4자리 이상 연속 숫자 런(run) 에 천단위 콤마를 삽입.
 *
 * 예:
 *   "15000"       → "15,000"
 *   "15000 ~"     → "15,000 ~"
 *   "15000~20000" → "15,000~20,000"
 *   "1만 5000원"  → "1만 5,000원"  (1만은 3자리 미만이라 유지)
 *   "제안"        → "제안"
 *   "1.5만"       → "1.5만"
 *   "010-1234-5678" → 전화번호로 보여도 4자리 이상이라 콤마 삽입될 수 있음 (허용)
 */
export function formatPrice(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  // 기존 콤마 있으면 한번 제거 후 재포맷 (중복 방지)
  const stripped = s.replace(/(\d),(?=\d{3})/g, '$1');
  return stripped.replace(/\d{4,}/g, (digits) => Number(digits).toLocaleString('ko-KR'));
}

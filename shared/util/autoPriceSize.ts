/**
 * 가격 라벨 길이에 따라 fontSize 자동 축소.
 *
 * 1,234,567 같이 7자리 이상이 되면 컨테이너 폭을 넘기 쉬워 잘리거나 줄바꿈됨.
 * 그 시점부터 점진적으로 글자를 줄여 한 줄 안에 다 표현되도록.
 *
 * 길이는 통화 기호+콤마 포함 (예: "¥1,234,567" = 10자, "₩12,345,000" = 11자).
 * UI 측에선 이 헬퍼가 결정한 값을 fontSize 로 그대로 쓰면 된다.
 *
 * @param label  표시할 가격 문자열. null/undefined 면 base 그대로.
 * @param base   기본 fontSize.
 * @param min    최소 fontSize (너무 작아지면 안 보임). 기본 9.
 */
export function autoPriceSize(
  label: string | null | undefined,
  base: number,
  min: number = 9,
): number {
  if (!label) return base;
  const len = label.length;
  // 7자 이하 (예: "¥99,999") → 그대로
  if (len <= 7) return base;
  // 8~9자 (예: "¥999,999") → 92%
  if (len <= 9) return Math.max(min, Math.round(base * 0.92));
  // 10~11자 (예: "¥1,234,567") → 82%
  if (len <= 11) return Math.max(min, Math.round(base * 0.82));
  // 12~13자 (예: "₩12,345,000") → 72%
  if (len <= 13) return Math.max(min, Math.round(base * 0.72));
  // 14자+ (예: "₩123,450,000") → 62%
  return Math.max(min, Math.round(base * 0.62));
}

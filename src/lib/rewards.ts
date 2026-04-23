/** 활동별 포인트 보상. 클라이언트에서 사용 (mock). */

export const REWARDS = {
  /** 일반 피드 작성 */
  feed_general: 5,
  /** 혼잡도 제보 작성 — 더 가치 있는 정보라 더 높음 */
  feed_report: 15,
  /** 거래글 등록 */
  trade_post: 10,
  /** 거래 완료 처리 (판매자 기준) */
  trade_done: 50,
  /** 오리파 뽑기 실패 위로금 (S/A 외) */
  oripa_consol: 0,
} as const;

export type RewardKey = keyof typeof REWARDS;

export function rewardLabel(key: RewardKey): string {
  const map: Record<RewardKey, string> = {
    feed_general: '일반 피드 작성',
    feed_report: '혼잡도 제보',
    trade_post: '거래글 등록',
    trade_done: '거래 완료',
    oripa_consol: '오리파 위로금',
  };
  return map[key];
}

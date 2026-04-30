/** 활동별 포인트 보상. 클라이언트에서 사용 (mock). */

export const REWARDS = {
  /** 일반 피드 작성 */
  feed_general: 10,
  /** 혼잡도 제보 작성 — 더 가치 있는 정보라 더 높음 */
  feed_report: 15,
  /** 거래글 등록 */
  trade_post: 10,
  /** 거래 완료 처리 (판매자 기준) */
  trade_done: 50,
  /** 오리파 뽑기 실패 위로금 (S/A 외) */
  oripa_consol: 0,
  /** 하루 1회 출석 보상 (KST 기준 일자 변경 시) */
  login_daily: 10,
  /** 3일 연속 출석마다 추가 보너스 (3,6,9,...일 차) */
  login_streak3_bonus: 50,
} as const;

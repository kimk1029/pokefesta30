/**
 * 1px 픽셀 보더 — border 대신 box-shadow 4방향 오프셋으로 그리는 얇은 잉크
 * 테두리 (레이아웃 폭에 영향 없음). 굵은(2px/3px) 변형이나 하드 섀도우가
 * 붙는 경우 `${PIXEL_BORDER},2px 2px 0 var(--ink)` 처럼 이어붙여 쓴다.
 */
export const PIXEL_BORDER =
  '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)';

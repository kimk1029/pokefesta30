/**
 * 카드 센터링 → PSA 추정 등급 — 웹 CardGrader · 모바일 ScanPreview 공용 순수 로직 정본.
 * 외곽(outer)/내곽(inner) 사각형의 여백 비율로 L/R·T/B 센터링을 계산하고
 * PSA 밴드(앞면 센터링 임계값)로 매핑한다.
 *
 * 정확도는 촬영 환경에 의존 — "참고용 추정치", 실제 PSA/BGS 등급과 다를 수 있음.
 */

export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt]; // [TL, TR, BR, BL]

// PSA 센터링 임계값 (앞면 기준, %_min:%_max — 가까운 쪽 / 먼 쪽)
export const PSA_BANDS: Array<{ label: string; max: number; tone: string }> = [
  { label: 'PSA 10 (Gem Mint)', max: 55, tone: '#FF3B6B' },
  { label: 'PSA 9 (Mint)', max: 60, tone: '#FFD23F' },
  { label: 'PSA 8 (NM-MT)', max: 65, tone: '#3A5BD9' },
  { label: 'PSA 7 (NM)', max: 70, tone: '#0D7377' },
  { label: 'PSA 6 (EX-MT)', max: 75, tone: '#6B7280' },
  { label: 'PSA 5 이하', max: 100, tone: '#999999' },
];

export interface CenteringResult {
  // 가까운 변(작은 여백) 비율 — 0..100 (50 = 완벽 중앙)
  lrCloser: number;
  tbCloser: number;
  // L/R 라벨 ("47/53") + T/B 라벨
  lrLabel: string;
  tbLabel: string;
  // 둘 중 안 좋은 축 (등급 결정)
  worstCloser: number;
  worstAxis: 'L/R' | 'T/B';
  band: typeof PSA_BANDS[number];
}

/** 서버/느슨한 응답의 4점 배열 → Quad. 4점이 아니거나 좌표가 깨졌으면 null. */
export function toQuad(pts: Array<{ x: number; y: number }> | null | undefined): Quad | null {
  if (!pts || pts.length !== 4) return null;
  if (pts.some((p) => typeof p?.x !== 'number' || typeof p?.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return null;
  }
  return [pts[0], pts[1], pts[2], pts[3]].map((p) => ({ x: p.x, y: p.y })) as Quad;
}

/** 사각형의 4코너를 무게중심 쪽으로 ratio 만큼 이동 (0.045 = 4.5%) */
export function shrinkQuad(q: Quad, ratio: number): Quad {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  return q.map((p) => ({
    x: p.x + (cx - p.x) * ratio,
    y: p.y + (cy - p.y) * ratio,
  })) as Quad;
}

/**
 * 외곽/내곽 사각형으로부터 센터링 추정.
 * 평면 촬영 가정 — 픽셀 단위로 좌/우, 상/하 여백 평균 비교.
 */
export function computeCentering(outer: Quad, inner: Quad): CenteringResult {
  const leftM = ((inner[0].x - outer[0].x) + (inner[3].x - outer[3].x)) / 2;
  const rightM = ((outer[1].x - inner[1].x) + (outer[2].x - inner[2].x)) / 2;
  const topM = ((inner[0].y - outer[0].y) + (inner[1].y - outer[1].y)) / 2;
  const bottomM = ((outer[3].y - inner[3].y) + (outer[2].y - inner[2].y)) / 2;

  const lrTotal = Math.max(0.0001, leftM + rightM);
  const tbTotal = Math.max(0.0001, topM + bottomM);

  // 0..1 비율 (음수면 0, 1 초과면 1)
  const leftRatio = clamp(leftM / lrTotal, 0, 1);
  const topRatio = clamp(topM / tbTotal, 0, 1);

  // %단위 (가까운 변 기준 — 작은쪽 = closer)
  const leftPct = Math.round(leftRatio * 100);
  const rightPct = 100 - leftPct;
  const topPct = Math.round(topRatio * 100);
  const bottomPct = 100 - topPct;

  const lrCloser = Math.min(leftPct, rightPct);
  const tbCloser = Math.min(topPct, bottomPct);

  const lrLabel = `${leftPct}/${rightPct}`;
  const tbLabel = `${topPct}/${bottomPct}`;

  // 둘 중 더 안 좋은 축
  const worstCloser = Math.min(lrCloser, tbCloser);
  const worstAxis: 'L/R' | 'T/B' = lrCloser <= tbCloser ? 'L/R' : 'T/B';

  // PSA 등급은 "먼 쪽" 비율로 판정 (예: 55/45 → 55 가 max). 즉 100 - closer.
  const farPct = 100 - worstCloser;
  const band = PSA_BANDS.find((b) => farPct <= b.max) ?? PSA_BANDS[PSA_BANDS.length - 1];

  return { lrCloser, tbCloser, lrLabel, tbLabel, worstCloser, worstAxis, band };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

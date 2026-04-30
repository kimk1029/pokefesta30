/**
 * 외부 라이브러리/CDN 없이 순수 JS + Canvas 로 카드 외곽 사각형 추정.
 *
 * 두 가지 전략을 시도하고 점수가 더 높은 결과를 채택:
 *  A) 배경 색 샘플 + 마스크 — 단색/단순 배경에서 빠르고 정확
 *  B) Sobel 엣지 + Hough 라인 변환 — 잡배경, 패턴 있는 책상에서도 카드 4 직선 찾음
 *
 * 점수 = 카드 종횡비(63:88 ≈ 0.716) 가까움 × 면적 비율
 *
 * 한계:
 *  - 두 전략 모두 정면 촬영을 가정 (강한 perspective 왜곡 시 정확도 ↓)
 *  - 카드와 배경 명도/색이 거의 같으면 둘 다 실패할 수 있음 — 이 때 폴백 사각형 사용
 *
 * 다운로드 0bytes, 모바일 GPU 없이 ~50~250ms.
 */

export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt]; // [TL, TR, BR, BL]

const PROC_LONG_SIDE = 400; // 처리용 다운스케일 — 속도/정확도 절충
const TARGET_RATIO = 63 / 88; // Pokemon TCG 단변/장변 비율

/**
 * 사진을 받아 외곽 사각형 추정. 실패 시 null.
 * 결과 좌표는 원본(자연) 픽셀 단위.
 */
export function detectCardOuterPureJs(img: HTMLImageElement): Quad | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longSide > PROC_LONG_SIDE ? PROC_LONG_SIDE / longSide : 1;
  const w = Math.max(50, Math.round(img.naturalWidth * scale));
  const h = Math.max(50, Math.round(img.naturalHeight * scale));

  const pixels = drawAndExtract(img, w, h);
  if (!pixels) return null;
  const gray = grayscale(pixels, w, h);

  // 두 전략 동시 시도 — 더 점수 좋은 쪽 채택
  const candidates: Array<{ quad: Quad; score: number; tag: string }> = [];

  const colorQuad = detectByColor(pixels, w, h);
  if (colorQuad) {
    const sc = scoreQuad(colorQuad, w, h);
    if (sc > 0.2) candidates.push({ quad: colorQuad, score: sc, tag: 'color' });
  }

  const houghQuad = detectByHough(gray, w, h);
  if (houghQuad) {
    const sc = scoreQuad(houghQuad, w, h);
    if (sc > 0.2) candidates.push({ quad: houghQuad, score: sc, tag: 'hough' });
  }

  if (candidates.length === 0) return null;
  // 가장 높은 점수
  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0].quad;

  // 다운스케일 비율 만큼 원본 좌표로 복원 + 클램프
  const inv = 1 / scale;
  return winner.map((p) => ({
    x: Math.max(0, Math.min(img.naturalWidth, p.x * inv)),
    y: Math.max(0, Math.min(img.naturalHeight, p.y * inv)),
  })) as Quad;
}

/* ====================== 공통 캔버스 / 그레이스케일 ====================== */

function drawAndExtract(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // tainted canvas
  }
}

function grayscale(px: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    // ITU-R BT.601 luma
    out[i] = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000 | 0;
  }
  return out;
}

/* ============================ A. Color-based ============================ */

interface Bg { r: number; g: number; b: number }

function sampleBackground(px: Uint8ClampedArray, w: number, h: number): Bg {
  let r = 0, g = 0, b = 0, n = 0;
  const corners: Array<[number, number]> = [
    [0, 0],
    [w - 5, 0],
    [0, h - 5],
    [w - 5, h - 5],
  ];
  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        const x = Math.max(0, Math.min(w - 1, cx + dx));
        const y = Math.max(0, Math.min(h - 1, cy + dy));
        const i = (y * w + x) * 4;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] =
        (mask[i] ||
          mask[i - 1] || mask[i + 1] ||
          mask[i - w] || mask[i + w] ||
          mask[i - w - 1] || mask[i - w + 1] ||
          mask[i + w - 1] || mask[i + w + 1]) ? 1 : 0;
    }
  }
  return out;
}

function detectByColor(pixels: Uint8ClampedArray, w: number, h: number): Quad | null {
  const bg = sampleBackground(pixels, w, h);
  const mask = new Uint8Array(w * h);
  const threshDist = 38;
  let fgCount = 0;
  for (let i = 0; i < w * h; i++) {
    const dr = pixels[i * 4] - bg.r;
    const dg = pixels[i * 4 + 1] - bg.g;
    const db = pixels[i * 4 + 2] - bg.b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > threshDist) {
      mask[i] = 1;
      fgCount++;
    }
  }
  const fgRatio = fgCount / (w * h);
  if (fgRatio < 0.05 || fgRatio > 0.97) return null;

  const closed = dilate(mask, w, h);

  const leftPts: Pt[] = [];
  const rightPts: Pt[] = [];
  for (let y = 0; y < h; y++) {
    let lx = -1, rx = -1;
    for (let x = 0; x < w; x++) if (closed[y * w + x]) { lx = x; break; }
    for (let x = w - 1; x >= 0; x--) if (closed[y * w + x]) { rx = x; break; }
    if (lx >= 0 && rx >= 0 && rx - lx > w * 0.1) {
      leftPts.push({ x: lx, y });
      rightPts.push({ x: rx, y });
    }
  }
  const topPts: Pt[] = [];
  const bottomPts: Pt[] = [];
  for (let x = 0; x < w; x++) {
    let ty = -1, by = -1;
    for (let y = 0; y < h; y++) if (closed[y * w + x]) { ty = y; break; }
    for (let y = h - 1; y >= 0; y--) if (closed[y * w + x]) { by = y; break; }
    if (ty >= 0 && by >= 0 && by - ty > h * 0.1) {
      topPts.push({ x, y: ty });
      bottomPts.push({ x, y: by });
    }
  }
  if (leftPts.length < 5 || topPts.length < 5) return null;

  const left = fitVerticalLineLSQ(trim(leftPts, 0.1));
  const right = fitVerticalLineLSQ(trim(rightPts, 0.1));
  const top = fitHorizontalLineLSQ(trim(topPts, 0.1));
  const bottom = fitHorizontalLineLSQ(trim(bottomPts, 0.1));
  if (!left || !right || !top || !bottom) return null;

  const tl = intersectLines(left, top);
  const tr = intersectLines(right, top);
  const br = intersectLines(right, bottom);
  const bl = intersectLines(left, bottom);
  if (!tl || !tr || !br || !bl) return null;
  return orderCornersTLTRBRBL([tl, tr, br, bl]);
}

/* ============== B. Sobel + Hough Line Transform =============== */

/**
 * 카드 4 직선을 Hough 변환으로 검출. 잡배경에서도 강건.
 *  1. Sobel 로 gradient magnitude
 *  2. 상위 8% 픽셀만 edge 로 채택 (자동 임계)
 *  3. (rho, theta) accumulator
 *  4. 수직선 후보 (theta near 0/π) + 수평선 후보 (theta near π/2) 분리해 각각 강한 2개 선택
 *  5. 4 변 직선 → 6쌍 교점 중 4 코너 추출
 */
function detectByHough(gray: Uint8Array, w: number, h: number): Quad | null {
  const sobel = sobelMagnitude(gray, w, h);
  // 상위 ~8% 픽셀을 edge 로 — 적당히 spar 한 값
  const thresh = topPercentileThreshold(sobel, 0.92);
  if (thresh <= 0) return null;

  // Hough accumulator: theta 90 bins (0..π, 2° step), rho range = -diag..+diag
  const NUM_THETA = 90;
  const diag = Math.ceil(Math.sqrt(w * w + h * h));
  const NUM_RHO = 2 * diag + 1;
  const acc = new Int32Array(NUM_THETA * NUM_RHO);
  const sinT = new Float32Array(NUM_THETA);
  const cosT = new Float32Array(NUM_THETA);
  for (let t = 0; t < NUM_THETA; t++) {
    const a = (t * Math.PI) / NUM_THETA;
    sinT[t] = Math.sin(a);
    cosT[t] = Math.cos(a);
  }

  // edge 픽셀만 vote
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (sobel[idx] < thresh) continue;
      for (let t = 0; t < NUM_THETA; t++) {
        const rho = Math.round(x * cosT[t] + y * sinT[t]) + diag;
        acc[t * NUM_RHO + rho]++;
      }
    }
  }

  // 분리: 수직선(theta near 0 or theta near π → 우리 90 bins 배열에선 t≈0 또는 t≈89)
  //       수평선(theta near π/2 → t≈45)
  const VERT_RANGE = Math.round(NUM_THETA * 0.18); // t ∈ [0, 16] ∪ [73, 89]
  const HORZ_LO = Math.round(NUM_THETA * 0.32);    // t ∈ [29, 60]
  const HORZ_HI = Math.round(NUM_THETA * 0.68);

  // 수직선 후보 — accumulator 에서 vert 영역만 보고 NMS 후 강도순
  const vertCands = peakLines(acc, NUM_THETA, NUM_RHO, diag, (t) => t < VERT_RANGE || t >= NUM_THETA - VERT_RANGE);
  const horzCands = peakLines(acc, NUM_THETA, NUM_RHO, diag, (t) => t >= HORZ_LO && t < HORZ_HI);
  if (vertCands.length < 2 || horzCands.length < 2) return null;

  // 좌/우 = vert 중 rho 작은 쪽 / 큰 쪽
  vertCands.sort((a, b) => a.rho - b.rho);
  const left = vertCands[0];
  const right = vertCands[vertCands.length - 1];
  // rho 차이가 너무 좁으면 (둘이 사실상 같은 선) 다음 후보 시도
  if (right.rho - left.rho < w * 0.3) return null;

  horzCands.sort((a, b) => a.rho - b.rho);
  const top = horzCands[0];
  const bottom = horzCands[horzCands.length - 1];
  if (bottom.rho - top.rho < h * 0.3) return null;

  // 4 직선 (rho, theta) → ax + by + c = 0 형태 변환 후 교점
  const lL = lineFromRhoTheta(left);
  const lR = lineFromRhoTheta(right);
  const lT = lineFromRhoTheta(top);
  const lB = lineFromRhoTheta(bottom);

  const tl = intersectLines(lL, lT);
  const tr = intersectLines(lR, lT);
  const br = intersectLines(lR, lB);
  const bl = intersectLines(lL, lB);
  if (!tl || !tr || !br || !bl) return null;

  return orderCornersTLTRBRBL([tl, tr, br, bl]);
}

function sobelMagnitude(gray: Uint8Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], tc = gray[i - w], tr = gray[i - w + 1];
      const ml = gray[i - 1],     mr = gray[i + 1];
      const bl = gray[i + w - 1], bc = gray[i + w], br = gray[i + w + 1];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/** Float32Array 의 percentile-th 이상 값을 임계로 — 히스토그램 256-bin 으로 근사. */
function topPercentileThreshold(arr: Float32Array, percentile: number): number {
  let max = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  if (max === 0) return 0;
  const bins = 256;
  const hist = new Int32Array(bins);
  for (let i = 0; i < arr.length; i++) {
    const b = Math.min(bins - 1, (arr[i] / max * bins) | 0);
    hist[b]++;
  }
  const target = arr.length * percentile;
  let cum = 0;
  for (let b = 0; b < bins; b++) {
    cum += hist[b];
    if (cum >= target) return (b / bins) * max;
  }
  return max;
}

interface HoughLine {
  rho: number;
  theta: number; // radian (0..π)
  votes: number;
}

/**
 * accumulator 에서 thetaFilter 통과한 셀들 중 강한 피크들 추출.
 * NMS: 같은 직선 근처 중복 방지 — rho ±5, theta ±2 윈도우.
 * 상위 6개 반환 (충분).
 */
function peakLines(
  acc: Int32Array,
  numTheta: number,
  numRho: number,
  diag: number,
  thetaFilter: (t: number) => boolean,
): HoughLine[] {
  // 후보 수집
  const cands: HoughLine[] = [];
  for (let t = 0; t < numTheta; t++) {
    if (!thetaFilter(t)) continue;
    for (let r = 0; r < numRho; r++) {
      const v = acc[t * numRho + r];
      if (v > 0) {
        cands.push({ rho: r - diag, theta: (t * Math.PI) / numTheta, votes: v });
      }
    }
  }
  // 강도순 정렬
  cands.sort((a, b) => b.votes - a.votes);

  // NMS — 가까운 후보 제거
  const picked: HoughLine[] = [];
  const RHO_NEAR = 12;
  const THETA_NEAR = (3 * Math.PI) / numTheta;
  for (const c of cands) {
    let dup = false;
    for (const p of picked) {
      const dRho = Math.abs(c.rho - p.rho);
      // theta 도 wrap 고려 (0 / π 가 같은 방향)
      const dTheta = Math.min(
        Math.abs(c.theta - p.theta),
        Math.abs(c.theta - p.theta + Math.PI),
        Math.abs(c.theta - p.theta - Math.PI),
      );
      if (dRho < RHO_NEAR && dTheta < THETA_NEAR) { dup = true; break; }
    }
    if (!dup) picked.push(c);
    if (picked.length >= 6) break;
  }
  return picked;
}

interface Line {
  /** ax + by + c = 0 */
  a: number;
  b: number;
  c: number;
}

/** Hough (rho, theta) → ax + by + c = 0 (a=cosθ, b=sinθ, c=-rho) */
function lineFromRhoTheta(L: HoughLine): Line {
  return { a: Math.cos(L.theta), b: Math.sin(L.theta), c: -L.rho };
}

/* =================== 공통 — 직선 fit / 교점 / 정렬 / 점수 =================== */

function trim<T>(arr: T[], pct: number): T[] {
  const n = Math.floor(arr.length * pct);
  return arr.slice(n, arr.length - n);
}

function fitVerticalLineLSQ(pts: Pt[]): Line | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumY = 0, sumX = 0, sumYY = 0, sumXY = 0;
  for (const p of pts) { sumY += p.y; sumX += p.x; sumYY += p.y * p.y; sumXY += p.x * p.y; }
  const det = n * sumYY - sumY * sumY;
  if (Math.abs(det) < 1e-6) return null;
  const m = (n * sumXY - sumX * sumY) / det;
  const k = (sumX - m * sumY) / n;
  // x = m·y + k → 1·x + (-m)·y + (-k) = 0
  return { a: 1, b: -m, c: -k };
}

function fitHorizontalLineLSQ(pts: Pt[]): Line | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (const p of pts) { sumX += p.x; sumY += p.y; sumXX += p.x * p.x; sumXY += p.x * p.y; }
  const det = n * sumXX - sumX * sumX;
  if (Math.abs(det) < 1e-6) return null;
  const m = (n * sumXY - sumX * sumY) / det;
  const k = (sumY - m * sumX) / n;
  // y = m·x + k → m·x + (-1)·y + k = 0
  return { a: m, b: -1, c: k };
}

function intersectLines(L1: Line, L2: Line): Pt | null {
  const det = L1.a * L2.b - L2.a * L1.b;
  if (Math.abs(det) < 1e-6) return null;
  const x = (L1.b * L2.c - L2.b * L1.c) / -det;
  const y = (L2.a * L1.c - L1.a * L2.c) / -det;
  return { x, y };
}

function orderCornersTLTRBRBL(pts: Pt[]): Quad {
  const sums = pts.map((p) => p.x + p.y);
  const diffs = pts.map((p) => p.y - p.x);
  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const bl = pts[diffs.indexOf(Math.max(...diffs))];
  const tr = pts[diffs.indexOf(Math.min(...diffs))];
  return [tl, tr, br, bl];
}

/**
 * 후보 quad 의 점수 — 카드 종횡비에 가까울수록 + 면적 클수록 + 이미지 안에 있을수록 ↑
 * 0..1 범위 (높을수록 좋음).
 */
function scoreQuad(q: Quad, w: number, h: number): number {
  // 면적 (signed) 의 절댓값을 shoelace 로
  const area = Math.abs(
    q[0].x * q[1].y - q[1].x * q[0].y +
    q[1].x * q[2].y - q[2].x * q[1].y +
    q[2].x * q[3].y - q[3].x * q[2].y +
    q[3].x * q[0].y - q[0].x * q[3].y,
  ) / 2;
  const imgArea = w * h;
  const areaScore = Math.max(0, Math.min(1, area / imgArea));

  // 종횡비
  const wA = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2;
  const wB = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2;
  if (wA <= 0 || wB <= 0) return 0;
  const ratio = Math.min(wA, wB) / Math.max(wA, wB);
  const ratioScore = 1 - Math.min(0.6, Math.abs(ratio - TARGET_RATIO) * 1.6);

  // 코너가 이미지 안쪽에 있을수록
  let oob = 0;
  for (const p of q) {
    if (p.x < -2 || p.x > w + 2 || p.y < -2 || p.y > h + 2) oob++;
  }
  const insideScore = 1 - oob / 4;

  return areaScore * 0.4 + ratioScore * 0.45 + insideScore * 0.15;
}

/**
 * 외부 라이브러리/CDN 없이 순수 JS 로 카드 외곽 사각형 추정.
 *
 * 알고리즘 (background-flood 방식):
 *  1. 이미지를 ~400px 작은 캔버스로 다운스케일 (속도 + 노이즈 안정화)
 *  2. 4 모서리 픽셀 색을 "배경 샘플" 로 채취 → 배경 평균색 추정
 *  3. 각 픽셀이 배경색에 가까운지(threshold) 판정 → 카드 마스크 (foreground)
 *  4. 좌/우/상/하 각 변에서 안쪽으로 행/열 별 최외곽 foreground 픽셀 위치 → 4 변 추정
 *  5. 4 변의 직선 추정 결과로 4 코너 도출
 *
 * 한계:
 *  - 단색에 가까운 배경에서 가장 정확. 카드가 배경에 거의 가까운 색이면 실패 가능.
 *  - 강한 perspective 왜곡엔 취약 (4 코너를 직선 교차로 잡지 않고 행별 최외곽 픽셀의 평균 사용).
 *  - 그래도 OpenCV 미로드/타임아웃 시 항상 fallback 으로 동작 — 다운로드 0bytes.
 */

export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt]; // [TL, TR, BR, BL]

/**
 * 사진을 받아 외곽 사각형 추정. 실패 시 null.
 * 결과 좌표는 원본(자연) 픽셀 단위.
 */
export function detectCardOuterPureJs(img: HTMLImageElement): Quad | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const PROC = 400; // 처리용 long side
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longSide > PROC ? PROC / longSide : 1;
  const w = Math.max(50, Math.round(img.naturalWidth * scale));
  const h = Math.max(50, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // tainted canvas (cross-origin) — 못 읽으면 포기
    return null;
  }

  // 1) 배경 샘플 — 4 모서리에서 5×5 평균
  const bg = sampleBackground(pixels, w, h);

  // 2) 픽셀 분류 (foreground 마스크). 동일 길이 Uint8Array (1=fg, 0=bg)
  // 임계값: 채택 조건이 너무 빡빡하면 카드 가장자리 일부가 bg 로 분류 → 안쪽으로 잘림.
  // RGB 거리 + 명도 차이 함께 사용.
  const mask = new Uint8Array(w * h);
  const threshDist = 38; // RGB 거리 임계치 (총 ~441 max)
  let fgCount = 0;
  for (let i = 0; i < w * h; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const dr = r - bg.r;
    const dg = g - bg.g;
    const db = b - bg.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist > threshDist) {
      mask[i] = 1;
      fgCount++;
    }
  }
  // foreground 비율이 너무 작거나 너무 크면 (사진 거의 단색) 실패
  const fgRatio = fgCount / (w * h);
  if (fgRatio < 0.05 || fgRatio > 0.97) return null;

  // 3) morphological close (3×3 dilation) — 노이즈 hole 메움
  const closed = dilate(mask, w, h);

  // 4) 각 변 추정
  // 좌변: 행 별로 가장 왼쪽 fg 픽셀의 x. 모두 모아 중앙값 ± 분산 작은 점만 사용.
  // 마찬가지로 우/상/하.
  const leftPts: Pt[] = [];
  const rightPts: Pt[] = [];
  for (let y = 0; y < h; y++) {
    let lx = -1;
    let rx = -1;
    for (let x = 0; x < w; x++) {
      if (closed[y * w + x]) {
        lx = x;
        break;
      }
    }
    for (let x = w - 1; x >= 0; x--) {
      if (closed[y * w + x]) {
        rx = x;
        break;
      }
    }
    if (lx >= 0 && rx >= 0 && rx - lx > w * 0.1) {
      leftPts.push({ x: lx, y });
      rightPts.push({ x: rx, y });
    }
  }
  const topPts: Pt[] = [];
  const bottomPts: Pt[] = [];
  for (let x = 0; x < w; x++) {
    let ty = -1;
    let by = -1;
    for (let y = 0; y < h; y++) {
      if (closed[y * w + x]) {
        ty = y;
        break;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      if (closed[y * w + x]) {
        by = y;
        break;
      }
    }
    if (ty >= 0 && by >= 0 && by - ty > h * 0.1) {
      topPts.push({ x, y: ty });
      bottomPts.push({ x, y: by });
    }
  }
  if (leftPts.length < 5 || topPts.length < 5) return null;

  // 5) 각 변에 직선 fit (least-squares). 단순화: 양 끝 ~10% 트리밍해 노이즈 제거 후 평균선.
  const left = fitVerticalLine(trim(leftPts, 0.1));
  const right = fitVerticalLine(trim(rightPts, 0.1));
  const top = fitHorizontalLine(trim(topPts, 0.1));
  const bottom = fitHorizontalLine(trim(bottomPts, 0.1));
  if (!left || !right || !top || !bottom) return null;

  // 6) 4 변의 교점 → 코너
  const tl = intersect(left, top);
  const tr = intersect(right, top);
  const br = intersect(right, bottom);
  const bl = intersect(left, bottom);
  if (!tl || !tr || !br || !bl) return null;

  // 7) 다운스케일 비율 만큼 원본 좌표로 복원
  const inv = 1 / scale;
  const quad: Quad = [
    { x: tl.x * inv, y: tl.y * inv },
    { x: tr.x * inv, y: tr.y * inv },
    { x: br.x * inv, y: br.y * inv },
    { x: bl.x * inv, y: bl.y * inv },
  ];

  // 코너가 이미지 밖이면 클램프
  return quad.map((p) => ({
    x: Math.max(0, Math.min(img.naturalWidth, p.x)),
    y: Math.max(0, Math.min(img.naturalHeight, p.y)),
  })) as Quad;
}

/* ----------------------------- helpers ------------------------------- */

interface Bg { r: number; g: number; b: number }

function sampleBackground(px: Uint8ClampedArray, w: number, h: number): Bg {
  // 4 모서리에서 5×5 = 100 샘플의 RGB 평균
  let r = 0, g = 0, b = 0;
  let n = 0;
  const corners = [
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
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
        n++;
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
      // 3×3 neighborhood
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

function trim<T>(arr: T[], pct: number): T[] {
  const n = Math.floor(arr.length * pct);
  return arr.slice(n, arr.length - n);
}

interface Line {
  /** ax + by + c = 0 */
  a: number;
  b: number;
  c: number;
}

/**
 * 좌/우 변 — 거의 수직선이라 x = m·y + k 형식의 LSQ fit.
 * 결과를 ax+by+c=0 (a=1, b=-m, c=-k) 로 변환.
 */
function fitVerticalLine(pts: Pt[]): Line | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumY = 0, sumX = 0, sumYY = 0, sumXY = 0;
  for (const p of pts) {
    sumY += p.y;
    sumX += p.x;
    sumYY += p.y * p.y;
    sumXY += p.x * p.y;
  }
  const det = n * sumYY - sumY * sumY;
  if (Math.abs(det) < 1e-6) return null;
  const m = (n * sumXY - sumX * sumY) / det;
  const k = (sumX - m * sumY) / n;
  // x = m·y + k  →  1·x + (-m)·y + (-k) = 0
  return { a: 1, b: -m, c: -k };
}

function fitHorizontalLine(pts: Pt[]): Line | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (const p of pts) {
    sumX += p.x;
    sumY += p.y;
    sumXX += p.x * p.x;
    sumXY += p.x * p.y;
  }
  const det = n * sumXX - sumX * sumX;
  if (Math.abs(det) < 1e-6) return null;
  const m = (n * sumXY - sumX * sumY) / det;
  const k = (sumY - m * sumX) / n;
  // y = m·x + k  →  m·x + (-1)·y + k = 0
  return { a: m, b: -1, c: k };
}

function intersect(L1: Line, L2: Line): Pt | null {
  const det = L1.a * L2.b - L2.a * L1.b;
  if (Math.abs(det) < 1e-6) return null;
  const x = (L1.b * L2.c - L2.b * L1.c) / -det;
  const y = (L2.a * L1.c - L1.a * L2.c) / -det;
  return { x, y };
}

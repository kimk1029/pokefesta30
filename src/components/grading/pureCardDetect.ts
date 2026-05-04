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

  // 1순위 — 종합 합의(consensus): 색 + 엣지 + 채도 신호 voting → 행/열 projection bbox
  const consensus = detectByConsensus(pixels, gray, w, h);
  if (consensus) {
    const sc = scoreQuad(consensus, w, h);
    if (sc > 0.08) candidates.push({ quad: consensus, score: sc, tag: 'consensus' });
  }

  // 2~ — 단일 신호 backup
  const fgBbox = detectByForegroundBbox(pixels, w, h);
  if (fgBbox) {
    const sc = scoreQuad(fgBbox, w, h);
    if (sc > 0.08) candidates.push({ quad: fgBbox, score: sc, tag: 'fgbbox' });
  }

  const colorQuad = detectByColor(pixels, w, h);
  if (colorQuad) {
    const sc = scoreQuad(colorQuad, w, h);
    if (sc > 0.08) candidates.push({ quad: colorQuad, score: sc, tag: 'color' });
  }

  const blobQuad = detectByLargestBlob(pixels, w, h);
  if (blobQuad) {
    const sc = scoreQuad(blobQuad, w, h);
    if (sc > 0.08) candidates.push({ quad: blobQuad, score: sc, tag: 'blob' });
  }

  const houghQuad = detectByHough(gray, w, h);
  if (houghQuad) {
    const sc = scoreQuad(houghQuad, w, h);
    if (sc > 0.08) candidates.push({ quad: houghQuad, score: sc, tag: 'hough' });
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
  // 8 지점 (4 코너 + 4 변 중앙 가장자리) 에서 5×5 평균 → 각 지점의 RGB 채취 후
  // 채널별 median 으로 합성. 한쪽 코너에 그림자/카드일부가 들어가도 robust.
  const positions: Array<[number, number]> = [
    [2, 2],                             [Math.floor(w / 2) - 2, 2],                    [w - 7, 2],
    [2, Math.floor(h / 2) - 2],                                                        [w - 7, Math.floor(h / 2) - 2],
    [2, h - 7],                         [Math.floor(w / 2) - 2, h - 7],                [w - 7, h - 7],
  ];
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (const [cx, cy] of positions) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        const x = Math.max(0, Math.min(w - 1, cx + dx));
        const y = Math.max(0, Math.min(h - 1, cy + dy));
        const i = (y * w + x) * 4;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
    }
    rs.push(r / n); gs.push(g / n); bs.push(b / n);
  }
  rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
  const m = (rs.length / 2) | 0;
  return { r: Math.round(rs[m]), g: Math.round(gs[m]), b: Math.round(bs[m]) };
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

/* ============== A0. 종합 합의(consensus) 기반 검출 ============== */

/**
 * 여러 신호를 픽셀별 voting 으로 합쳐 카드/배경을 분리.
 * 단일 신호가 실패해도 다른 신호가 보강 → 더 안정적.
 *
 * 신호:
 *  S1: 배경 RGB 색에서 거리 큰 픽셀 (color)
 *  S2: 주변 엣지가 조밀한 픽셀 (texture/print 영역)
 *  S3: 채도가 배경과 다른 픽셀 (홀로/컬러카드는 채도 ↑, 책상은 ↓)
 *
 * 각 픽셀의 vote ∈ [0..3]. 2 이상이면 confident foreground.
 * 행/열별 projection 으로 카드 경계 찾음 — 노이즈에 강함.
 */
function detectByConsensus(
  pixels: Uint8ClampedArray,
  gray: Uint8Array,
  w: number,
  h: number,
): Quad | null {
  const n = w * h;
  const votes = new Uint8Array(n);

  // ---- S1: 배경 RGB 거리 ----
  const bg = sampleBackground(pixels, w, h);
  for (let i = 0; i < n; i++) {
    const dr = pixels[i * 4] - bg.r;
    const dg = pixels[i * 4 + 1] - bg.g;
    const db = pixels[i * 4 + 2] - bg.b;
    if (dr * dr + dg * dg + db * db > 28 * 28) votes[i]++;
  }

  // ---- S2: 엣지 조밀 영역 (Sobel magnitude → 5x5 box blur → 상위 35% 채택) ----
  const sobel = sobelMagnitude(gray, w, h);
  const sobelBlur = boxBlur(sobel, w, h, 2); // 5x5 mean
  const edgeThresh = topPercentileThreshold(sobelBlur, 0.65);
  if (edgeThresh > 0) {
    for (let i = 0; i < n; i++) if (sobelBlur[i] > edgeThresh) votes[i]++;
  }

  // ---- S3: 채도 차이 ----
  const bgSat = saturationOf(bg.r, bg.g, bg.b);
  for (let i = 0; i < n; i++) {
    const sat = saturationOf(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
    if (Math.abs(sat - bgSat) > 0.18) votes[i]++;
  }

  // ---- voting → fg 마스크 (>=2 votes) ----
  let fgCount = 0;
  for (let i = 0; i < n; i++) if (votes[i] >= 2) { votes[i] = 1; fgCount++; }
                              else votes[i] = 0;
  // 너무 적으면 임계 한 단계 낮춤 (votes >=1 도 카운트해 fallback)
  if (fgCount < n * 0.05) {
    return null;
  }

  // ---- 행/열 projection 으로 bbox ----
  const colSum = new Uint32Array(w);
  const rowSum = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (votes[row + x]) { colSum[x]++; rowSum[y]++; }
    }
  }
  // 임계: column 의 경우 height 의 25%, row 의 경우 width 의 25%
  // 카드 한 줄을 가로지르려면 그 정도는 픽셀이 있어야 함.
  const colThresh = h * 0.25;
  const rowThresh = w * 0.25;
  let x0 = -1, x1 = -1, y0 = -1, y1 = -1;
  for (let x = 0; x < w; x++) if (colSum[x] > colThresh) { x0 = x; break; }
  for (let x = w - 1; x >= 0; x--) if (colSum[x] > colThresh) { x1 = x; break; }
  for (let y = 0; y < h; y++) if (rowSum[y] > rowThresh) { y0 = y; break; }
  for (let y = h - 1; y >= 0; y--) if (rowSum[y] > rowThresh) { y1 = y; break; }

  if (x0 < 0 || y0 < 0) return null;
  if (x1 - x0 < w * 0.2 || y1 - y0 < h * 0.2) return null;

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/** RGB → HSV 채도 (0..1). 단순 max-min/max. */
function saturationOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  if (max === 0) return 0;
  const min = Math.min(r, g, b);
  return (max - min) / max;
}

/** Float32 1D 박스 블러. radius=2 면 5x5. */
function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const out = new Float32Array(w * h);
  const k = 2 * radius + 1;
  // 수평 패스
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) {
      const cx = Math.max(0, Math.min(w - 1, x));
      sum += src[y * w + cx];
    }
    tmp[y * w] = sum;
    for (let x = 1; x < w; x++) {
      const inX = Math.min(w - 1, x + radius);
      const outX = Math.max(0, x - radius - 1);
      sum += src[y * w + inX] - src[y * w + outX];
      tmp[y * w + x] = sum;
    }
  }
  // 수직 패스
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      const cy = Math.max(0, Math.min(h - 1, y));
      sum += tmp[cy * w + x];
    }
    out[x] = sum / (k * k);
    for (let y = 1; y < h; y++) {
      const inY = Math.min(h - 1, y + radius);
      const outY = Math.max(0, y - radius - 1);
      sum += tmp[inY * w + x] - tmp[outY * w + x];
      out[y * w + x] = sum / (k * k);
    }
  }
  return out;
}

/* ============ A1. 모든 foreground 픽셀의 axis-aligned bbox ============ */

/**
 * 가장 단순한 전략: 배경색에서 충분히 다른 모든 픽셀의 bounding box.
 *
 * 색이 명확히 다른 카드/배경 조합에서 거의 항상 정확한 결과를 줌.
 * connected components 도, line fitting 도 안 함 — 그냥 fg 픽셀 좌표 min/max.
 *
 * 노이즈 픽셀(먼지/그림자) 한두 개가 큰 영향을 끼칠 수 있으므로 1% 트림: 좌/우/상/하
 * 각 방향에서 1 percentile 의 fg 픽셀 좌표를 잡아 outlier 제거.
 */
function detectByForegroundBbox(pixels: Uint8ClampedArray, w: number, h: number): Quad | null {
  const bg = sampleBackground(pixels, w, h);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dr = pixels[i] - bg.r;
      const dg = pixels[i + 1] - bg.g;
      const db = pixels[i + 2] - bg.b;
      if (dr * dr + dg * dg + db * db > 28 * 28) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < w * h * 0.05) return null;

  // outlier 트림 — 1 percentile / 99 percentile (먼지·그림자 노이즈 1픽셀이 bbox 늘리는 거 방지)
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const pct = (arr: number[], p: number) =>
    arr[Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * p)))];
  const x0 = pct(xs, 0.01);
  const x1 = pct(xs, 0.99);
  const y0 = pct(ys, 0.01);
  const y1 = pct(ys, 0.99);

  if (x1 <= x0 || y1 <= y0) return null;
  if (x1 - x0 < w * 0.15 || y1 - y0 < h * 0.15) return null;

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/* ============ A2. 가장 큰 연결 성분의 axis-aligned bbox ============ */

/**
 * 배경색 마스크 → 연결 성분(connected components) 중 가장 큰 것의 bounding box.
 * LSQ 직선 fit 보다 단순하고 노이즈에 강함. 카드가 회전돼있으면 bbox 가 카드보다
 * 좀 크게 잡히지만 사용자가 핸들로 미세조정 가능하므로 OK.
 */
function detectByLargestBlob(pixels: Uint8ClampedArray, w: number, h: number): Quad | null {
  const bg = sampleBackground(pixels, w, h);
  const mask = new Uint8Array(w * h);
  let fgCount = 0;
  for (let i = 0; i < w * h; i++) {
    const dr = pixels[i * 4] - bg.r;
    const dg = pixels[i * 4 + 1] - bg.g;
    const db = pixels[i * 4 + 2] - bg.b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > 28) {
      mask[i] = 1;
      fgCount++;
    }
  }
  const fgRatio = fgCount / (w * h);
  if (fgRatio < 0.05 || fgRatio > 0.97) return null;

  const closed = dilate(mask, w, h);

  // BFS 로 가장 큰 연결 영역의 bbox 찾기
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  let bestArea = 0;
  let best = { x0: 0, y0: 0, x1: 0, y1: 0 };

  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const start = sy * w + sx;
      if (!closed[start] || visited[start]) continue;

      let area = 0;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      while (stack.length) {
        const idx = stack.pop()!;
        area++;
        const x = idx % w;
        const y = (idx - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && closed[idx - 1] && !visited[idx - 1]) { visited[idx - 1] = 1; stack.push(idx - 1); }
        if (x < w - 1 && closed[idx + 1] && !visited[idx + 1]) { visited[idx + 1] = 1; stack.push(idx + 1); }
        if (y > 0 && closed[idx - w] && !visited[idx - w]) { visited[idx - w] = 1; stack.push(idx - w); }
        if (y < h - 1 && closed[idx + w] && !visited[idx + w]) { visited[idx + w] = 1; stack.push(idx + w); }
      }

      if (area > bestArea) {
        bestArea = area;
        best = { x0, y0, x1, y1 };
      }
    }
  }

  if (bestArea < w * h * 0.1) return null;
  const { x0, y0, x1, y1 } = best;
  // bbox 가 이미지 거의 전체면 (사진 자체가 단색) reject
  if ((x1 - x0) > w * 0.97 && (y1 - y0) > h * 0.97) return null;

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/* ================= A3. 엣지 밀도 그리드 ================= */

/**
 * 카드와 배경이 색이 비슷해도, 카드 안에는 텍스트/아트/HP/번호 등으로 엣지가 조밀하고
 * 배경(테이블/책상)은 엣지가 거의 없음. 이 차이를 이용한 robust 검출.
 *
 * 1. Sobel magnitude 계산
 * 2. 이미지를 16×24 셀 그리드로 나눠 셀별 엣지 합 계산
 * 3. 셀 합의 70 percentile 을 임계로 → "고밀도" 셀 마스크
 * 4. 고밀도 셀들의 bounding box → 카드 영역
 *
 * 색에 무관하므로 색 기반 두 전략이 모두 실패하는 흰 카드/베이지 책상 같은 어려운
 * 케이스에서도 작동.
 */
function detectByEdgeDensity(gray: Uint8Array, w: number, h: number): Quad | null {
  const sobel = sobelMagnitude(gray, w, h);

  const GX = 16;
  const GY = 24;
  const cellW = Math.floor(w / GX);
  const cellH = Math.floor(h / GY);
  if (cellW < 4 || cellH < 4) return null;

  const cells = new Float32Array(GY * GX);
  for (let cy = 0; cy < GY; cy++) {
    const y0 = cy * cellH;
    const y1 = Math.min(h, y0 + cellH);
    for (let cx = 0; cx < GX; cx++) {
      const x0 = cx * cellW;
      const x1 = Math.min(w, x0 + cellW);
      let sum = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) sum += sobel[row + x];
      }
      cells[cy * GX + cx] = sum;
    }
  }

  // 70 percentile 임계
  const sorted = Array.from(cells).sort((a, b) => a - b);
  const thresh = sorted[Math.floor(sorted.length * 0.70)];
  if (thresh <= 0) return null;

  // 고밀도 셀 bbox
  let cx0 = GX, cy0 = GY, cx1 = -1, cy1 = -1;
  let denseCount = 0;
  for (let cy = 0; cy < GY; cy++) {
    for (let cx = 0; cx < GX; cx++) {
      if (cells[cy * GX + cx] > thresh) {
        denseCount++;
        if (cx < cx0) cx0 = cx;
        if (cy < cy0) cy0 = cy;
        if (cx > cx1) cx1 = cx;
        if (cy > cy1) cy1 = cy;
      }
    }
  }
  if (cx1 < cx0 || cy1 < cy0) return null;
  // 모든 셀이 dense 면 사진 자체가 noisy — reject
  if (denseCount > GX * GY * 0.85) return null;

  // 셀 좌표 → 픽셀 좌표 (셀 안의 가장자리)
  const x0 = cx0 * cellW;
  const y0 = cy0 * cellH;
  const x1 = Math.min(w, (cx1 + 1) * cellW);
  const y1 = Math.min(h, (cy1 + 1) * cellH);

  // 너무 좁으면 reject
  if (x1 - x0 < w * 0.2 || y1 - y0 < h * 0.2) return null;

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
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
  // 두 직선 a·x + b·y + c = 0 의 교점.
  // 시스템: [a1 b1; a2 b2][x;y] = [-c1;-c2]
  // det = a1·b2 - a2·b1
  // x = (b1·c2 - b2·c1) / det     (Cramer)
  // y = (a2·c1 - a1·c2) / det
  const det = L1.a * L2.b - L2.a * L1.b;
  if (Math.abs(det) < 1e-6) return null;
  const x = (L1.b * L2.c - L2.b * L1.c) / det;
  const y = (L2.a * L1.c - L1.a * L2.c) / det;
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
 * 후보 quad 의 점수 — 카드 종횡비 + 면적 sweet spot + 이미지 안쪽.
 *
 * 면적 점수는 sweet spot (이미지의 25~80%) 에 종 모양으로 weight.
 * 너무 작으면(노이즈), 너무 크면(전체 이미지) 둘 다 패널티 — 이전 버그(전체 이미지가
 * 진짜 카드보다 점수 높게 나오는 문제) 수정.
 */
function scoreQuad(q: Quad, w: number, h: number): number {
  const area = Math.abs(
    q[0].x * q[1].y - q[1].x * q[0].y +
    q[1].x * q[2].y - q[2].x * q[1].y +
    q[2].x * q[3].y - q[3].x * q[2].y +
    q[3].x * q[0].y - q[0].x * q[3].y,
  ) / 2;
  const imgArea = w * h;
  const ar = area / imgArea;

  // sweet spot 기반 면적 점수 — 25~80% 가 최고, 양 끝은 완만하게 감소
  let areaScore: number;
  if (ar < 0.05) areaScore = 0;
  else if (ar > 0.97) areaScore = 0;             // 거의 전체 이미지 = 명백히 잘못
  else if (ar < 0.15) areaScore = (ar - 0.05) / 0.10; // 0.05→0, 0.15→1
  else if (ar > 0.85) areaScore = (0.97 - ar) / 0.12; // 0.97→0, 0.85→1
  else areaScore = 1;

  // 종횡비 (단변/장변, 0..1)
  const wA = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / 2;
  const wB = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) / 2;
  if (wA <= 0 || wB <= 0) return 0;
  const ratio = Math.min(wA, wB) / Math.max(wA, wB);
  const ratioScore = 1 - Math.min(0.6, Math.abs(ratio - TARGET_RATIO) * 1.6);

  // 코너가 이미지 안쪽
  let oob = 0;
  for (const p of q) {
    if (p.x < -2 || p.x > w + 2 || p.y < -2 || p.y > h + 2) oob++;
  }
  const insideScore = 1 - oob / 4;

  // 가중: 면적 sweet spot 50% + 종횡비 35% + inside 15%
  return areaScore * 0.5 + ratioScore * 0.35 + insideScore * 0.15;
}

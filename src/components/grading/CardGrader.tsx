'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadOpenCv } from './openCvLoader';

/**
 * 카드 그레이딩(센터링 추정) 도구.
 *
 * 흐름: 사진 선택 → OpenCV.js 로 외곽 사각형 자동 검출 → 사용자가 8개 코너(외곽4 + 내곽4)
 * 핸들로 미세조정 → 좌/우, 상/하 여백 비율 + PSA 추정 등급 표시.
 *
 * 정확도는 촬영 환경에 의존 — 빛 반사 없는 정면 촬영, 단색 배경에서 가장 정확.
 * "참고용 추정치" — 실제 PSA/BGS 등급과 다를 수 있음.
 */

type Pt = { x: number; y: number };
type Quad = [Pt, Pt, Pt, Pt]; // [TL, TR, BR, BL]

// PSA 센터링 임계값 (앞면 기준, %_min:%_max — 가까운 쪽 / 먼 쪽)
const PSA_BANDS: Array<{ label: string; max: number; tone: string }> = [
  { label: 'PSA 10 (Gem Mint)', max: 55, tone: '#FF3B6B' },
  { label: 'PSA 9 (Mint)', max: 60, tone: '#FFD23F' },
  { label: 'PSA 8 (NM-MT)', max: 65, tone: '#3A5BD9' },
  { label: 'PSA 7 (NM)', max: 70, tone: '#0D7377' },
  { label: 'PSA 6 (EX-MT)', max: 75, tone: '#6B7280' },
  { label: 'PSA 5 이하', max: 100, tone: '#999999' },
];

interface CenteringResult {
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

export function CardGrader() {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [outer, setOuter] = useState<Quad | null>(null);
  const [inner, setInner] = useState<Quad | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);

  // 디스플레이 스케일: 자연 픽셀 → 화면 픽셀
  const scale = imgEl && displayW > 0 ? displayW / imgEl.naturalWidth : 1;

  /* OpenCV 미리 로드 (컴포넌트 마운트 시 백그라운드) ----------------- */
  useEffect(() => {
    setCvLoading(true);
    loadOpenCv()
      .then(() => setCvReady(true))
      .catch((e) => setErr(e instanceof Error ? e.message : 'OpenCV 로드 실패'))
      .finally(() => setCvLoading(false));
  }, []);

  /* 이미지 변경 시 canvas 사이즈 + 자동 검출 ---------------------- */
  useEffect(() => {
    if (!imgEl) return;
    const containerW = containerRef.current?.clientWidth ?? imgEl.naturalWidth;
    const w = Math.min(containerW, imgEl.naturalWidth);
    const h = (w / imgEl.naturalWidth) * imgEl.naturalHeight;
    setDisplayW(w);
    setDisplayH(h);

    if (cvReady) {
      autoDetect(imgEl);
    } else {
      // CV 아직 로딩 중이면 일단 폴백 사각형 띄우기
      const fb = fallbackQuads(imgEl.naturalWidth, imgEl.naturalHeight);
      setOuter(fb.outer);
      setInner(fb.inner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl, cvReady]);

  /* 캔버스 그리기 — 이미지 + 외곽/내곽 폴리라인 ------------------- */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !imgEl) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = displayW;
    c.height = displayH;
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(imgEl, 0, 0, displayW, displayH);

    if (outer) drawQuad(ctx, outer, scale, '#3A5BD9', 3);
    if (inner) drawQuad(ctx, inner, scale, '#FFD23F', 2);
  }, [imgEl, outer, inner, displayW, displayH, scale]);

  /* 파일 선택 핸들러 -------------------------------------------- */
  const onFile = (file: File) => {
    setErr(null);
    setOuter(null);
    setInner(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setImgEl(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setErr('이미지를 불러올 수 없어요');
    };
    img.src = url;
  };

  /* 자동 외곽 검출 ---------------------------------------------- */
  const autoDetect = useCallback((image: HTMLImageElement) => {
    setBusyLabel('외곽 검출 중…');
    setErr(null);
    // 비동기 처리 — UI 블록 방지
    setTimeout(() => {
      try {
        const detected = detectOuterQuad(image);
        if (detected) {
          setOuter(detected);
          setInner(shrinkQuad(detected, 0.045)); // 카드 인쇄 프레임 평균치 기준
        } else {
          // 검출 실패 — 폴백
          const fb = fallbackQuads(image.naturalWidth, image.naturalHeight);
          setOuter(fb.outer);
          setInner(fb.inner);
          setErr('외곽 자동 검출 실패 — 핸들로 직접 맞춰주세요');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '검출 실패');
        const fb = fallbackQuads(image.naturalWidth, image.naturalHeight);
        setOuter(fb.outer);
        setInner(fb.inner);
      } finally {
        setBusyLabel(null);
      }
    }, 30);
  }, []);

  /* 코너 드래그 ------------------------------------------------ */
  const draggingRef = useRef<{ which: 'outer' | 'inner'; idx: 0 | 1 | 2 | 3 } | null>(null);

  const onPointerDown = (which: 'outer' | 'inner', idx: 0 | 1 | 2 | 3) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { which, idx };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current;
    if (!d || !imgEl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const clampedX = Math.max(0, Math.min(imgEl.naturalWidth, px));
    const clampedY = Math.max(0, Math.min(imgEl.naturalHeight, py));
    if (d.which === 'outer' && outer) {
      const next = [...outer] as Quad;
      next[d.idx] = { x: clampedX, y: clampedY };
      setOuter(next);
    } else if (d.which === 'inner' && inner) {
      const next = [...inner] as Quad;
      next[d.idx] = { x: clampedX, y: clampedY };
      setInner(next);
    }
  };

  const onPointerUp = () => {
    draggingRef.current = null;
  };

  const result: CenteringResult | null = outer && inner ? computeCentering(outer, inner) : null;

  return (
    <div style={{ padding: '0 var(--gap)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = '';
        }}
      />

      {/* 안내 / CV 상태 */}
      <div
        style={{
          marginBottom: 10,
          padding: '8px 10px',
          background: 'var(--pap2)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink2)',
          letterSpacing: 0.3,
          lineHeight: 1.6,
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        💡 빛 반사 없는 곳에서 카드 정면을 촬영하세요. 단색 배경(검은 종이/책상)일수록 외곽 검출이 정확합니다.
        <br />
        ⚠ 이 값은 <b>참고용 추정치</b> — 실제 PSA/BGS 등급은 코너·표면·인쇄까지 함께 평가됩니다.
      </div>

      {!imgEl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={cvLoading && !cvReady}
            style={mainBtn('var(--blu)')}
          >
            📷 카드 사진 선택 / 촬영
          </button>
          {cvLoading && !cvReady && (
            <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', textAlign: 'center' }}>
              OpenCV 라이브러리 로드 중… (~3MB, 첫 1회만)
            </div>
          )}
        </div>
      )}

      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            background: 'var(--red)',
            color: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          ⚠ {err}
        </div>
      )}

      {imgEl && (
        <>
          <div
            ref={containerRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: displayW,
              height: displayH,
              margin: '0 auto 12px',
              touchAction: 'none',
              userSelect: 'none',
              background: 'var(--ink)',
            }}
          >
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            {outer && outer.map((p, i) => (
              <Handle
                key={`o-${i}`}
                x={p.x * scale}
                y={p.y * scale}
                color="#3A5BD9"
                onPointerDown={onPointerDown('outer', i as 0 | 1 | 2 | 3)}
              />
            ))}
            {inner && inner.map((p, i) => (
              <Handle
                key={`i-${i}`}
                x={p.x * scale}
                y={p.y * scale}
                color="#FFD23F"
                onPointerDown={onPointerDown('inner', i as 0 | 1 | 2 | 3)}
              />
            ))}
            {busyLabel && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,.6)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--yel)',
                  fontFamily: 'var(--f1)',
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                {busyLabel}
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => imgEl && autoDetect(imgEl)} disabled={!cvReady} style={ctrlBtn('var(--blu)')}>
              🔄 자동 재검출
            </button>
            <button
              type="button"
              onClick={() => {
                if (outer) setInner(shrinkQuad(outer, 0.045));
              }}
              disabled={!outer}
              style={ctrlBtn('var(--orn)')}
            >
              ↺ 내곽 리셋
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={ctrlBtn('var(--ink2)')}>
              🖼 다른 사진
            </button>
          </div>

          {/* 결과 */}
          {result && <ResultCard r={result} />}

          {/* 범례 */}
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', lineHeight: 1.7 }}>
            <span style={{ color: '#3A5BD9' }}>● 외곽(파랑)</span> = 카드 컷 라인 (테두리 끝).
            {' '}<span style={{ color: '#FFD23F' }}>● 내곽(노랑)</span> = 인쇄 프레임 안쪽 라인.
            <br />
            드래그로 8개 코너 핸들을 카드에 정확히 맞춰주세요.
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------- handle ---------------------------- */

function Handle({
  x,
  y,
  color,
  onPointerDown,
}: {
  x: number;
  y: number;
  color: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: x - 14,
        top: y - 14,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color,
        border: '2px solid white',
        boxShadow: '0 0 0 2px black',
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  );
}

/* --------------------------- result card ------------------------ */

function ResultCard({ r }: { r: CenteringResult }) {
  return (
    <div
      style={{
        padding: 12,
        marginBottom: 12,
        background: 'var(--white)',
        boxShadow:
          '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <Stat label="좌/우 (L/R)" value={r.lrLabel} hi={r.worstAxis === 'L/R'} />
        <Stat label="상/하 (T/B)" value={r.tbLabel} hi={r.worstAxis === 'T/B'} />
      </div>
      <div
        style={{
          padding: '10px 12px',
          background: r.band.tone,
          color: '#fff',
          fontFamily: 'var(--f1)',
          fontSize: 12,
          letterSpacing: 0.5,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        ▶ 추정 등급: <b>{r.band.label}</b>
      </div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', lineHeight: 1.6, textAlign: 'center' }}>
        센터링 한 항목 기준. 코너 / 표면 / 인쇄 결함은 별도.
      </div>
    </div>
  );
}

function Stat({ label, value, hi }: { label: string; value: string; hi: boolean }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.5, marginBottom: 4 }}>
        {label} {hi && '⚠'}
      </div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 18,
          fontWeight: 700,
          color: hi ? 'var(--red)' : 'var(--ink)',
          letterSpacing: 0.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* --------------------- helpers (math + cv) ---------------------- */

function drawQuad(ctx: CanvasRenderingContext2D, q: Quad, scale: number, color: string, lw: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(q[0].x * scale, q[0].y * scale);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x * scale, q[i].y * scale);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function fallbackQuads(w: number, h: number): { outer: Quad; inner: Quad } {
  const ox = w * 0.1;
  const oy = h * 0.1;
  const outer: Quad = [
    { x: ox, y: oy },
    { x: w - ox, y: oy },
    { x: w - ox, y: h - oy },
    { x: ox, y: h - oy },
  ];
  return { outer, inner: shrinkQuad(outer, 0.045) };
}

/** 사각형의 4코너를 무게중심 쪽으로 ratio 만큼 이동 (0.045 = 4.5%) */
function shrinkQuad(q: Quad, ratio: number): Quad {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  return q.map((p) => ({
    x: p.x + (cx - p.x) * ratio,
    y: p.y + (cy - p.y) * ratio,
  })) as Quad;
}

/** 4점을 TL, TR, BR, BL 순으로 정렬 */
function orderCorners(pts: Pt[]): Quad {
  // x+y 가 가장 작은 것 = TL, 가장 큰 것 = BR
  // y-x 가 가장 큰 것 = BL, 가장 작은 것 = TR
  const sums = pts.map((p) => p.x + p.y);
  const diffs = pts.map((p) => p.y - p.x);
  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const bl = pts[diffs.indexOf(Math.max(...diffs))];
  const tr = pts[diffs.indexOf(Math.min(...diffs))];
  return [tl, tr, br, bl];
}

/**
 * OpenCV.js 로 이미지에서 카드 외곽 사각형을 찾는다.
 * 실패 시 null. 메모리 누수 방지를 위해 모든 Mat / MatVector 명시적 delete.
 */
function detectOuterQuad(img: HTMLImageElement): Quad | null {
  if (typeof window === 'undefined') return null;
  const cv = (window as unknown as { cv?: CvLike }).cv;
  if (!cv || !cv.Mat) return null;

  const src = cv.imread(img);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edged = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let bestApprox: CvMat | null = null;
  let bestArea = 0;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

    // Otsu 이진화 → 카드와 배경의 명도차이로 외곽 분리. 검은 카드라도 INV 로 양쪽 모두 시도.
    cv.threshold(blurred, edged, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const minArea = src.rows * src.cols * 0.1;
    const maxArea = src.rows * src.cols * 0.98;

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i) as CvMat;
      const area = cv.contourArea(c, false);
      if (area < minArea || area > maxArea) {
        c.delete();
        continue;
      }
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, peri * 0.02, true);
      if (approx.rows === 4 && area > bestArea) {
        if (bestApprox) bestApprox.delete();
        bestApprox = approx;
        bestArea = area;
      } else {
        approx.delete();
      }
      c.delete();
    }

    if (!bestApprox) return null;

    const pts: Pt[] = [];
    for (let i = 0; i < 4; i++) {
      const x = bestApprox.data32S[i * 2];
      const y = bestApprox.data32S[i * 2 + 1];
      pts.push({ x, y });
    }
    return orderCorners(pts);
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edged.delete();
    contours.delete();
    hierarchy.delete();
    if (bestApprox) bestApprox.delete();
  }
}

/**
 * 외곽/내곽 사각형으로부터 센터링 추정.
 *
 * 단순화한 모델: 외곽 사각형이 거의 직사각형(평면 촬영)이라 가정하고 픽셀 단위로
 * 좌/우 여백 평균 + 상/하 여백 평균을 측정.
 *   leftMargin  = ((innerTL.x - outerTL.x) + (innerBL.x - outerBL.x)) / 2
 *   rightMargin = ((outerTR.x - innerTR.x) + (outerBR.x - innerBR.x)) / 2
 *   centeringL% = leftMargin / (leftMargin + rightMargin) * 100
 */
function computeCentering(outer: Quad, inner: Quad): CenteringResult {
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ----------------------- styles --------------------------------- */

function mainBtn(bg: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '14px 16px',
    fontFamily: 'var(--f1)',
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'var(--white)',
    background: bg,
    border: 'none',
    cursor: 'pointer',
    boxShadow:
      '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
  };
}

function ctrlBtn(bg: string): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 100,
    padding: '8px 10px',
    fontFamily: 'var(--f1)',
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'var(--white)',
    background: bg,
    border: 'none',
    cursor: 'pointer',
  };
}

/* --------------------- minimal cv types ------------------------- */

interface CvMat {
  rows: number;
  cols: number;
  data32S: Int32Array;
  delete: () => void;
}
interface CvMatVector {
  size: () => number;
  get: (i: number) => CvMat;
  delete: () => void;
}
interface CvSize {
  width: number;
  height: number;
}
interface CvLike {
  Mat: new () => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (w: number, h: number) => CvSize;
  imread: (img: HTMLImageElement | HTMLCanvasElement) => CvMat;
  cvtColor: (src: CvMat, dst: CvMat, code: number, dstCn?: number) => void;
  GaussianBlur: (src: CvMat, dst: CvMat, ksize: CvSize, sX: number, sY?: number, borderType?: number) => void;
  threshold: (src: CvMat, dst: CvMat, thresh: number, max: number, type: number) => number;
  findContours: (src: CvMat, contours: CvMatVector, hier: CvMat, mode: number, method: number) => void;
  contourArea: (c: CvMat, oriented?: boolean) => number;
  arcLength: (c: CvMat, closed: boolean) => number;
  approxPolyDP: (c: CvMat, dst: CvMat, eps: number, closed: boolean) => void;
  COLOR_RGBA2GRAY: number;
  BORDER_DEFAULT: number;
  THRESH_BINARY: number;
  THRESH_OTSU: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
}

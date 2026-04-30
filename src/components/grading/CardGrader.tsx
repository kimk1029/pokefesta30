'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { recognizeCard, type CardOcrResult } from './cardOcr';
import { isOpenCvReady, loadOpenCv } from './openCvLoader';

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
  // CV 는 마운트 시 자동 로드하지 않고, 사용자가 "자동 검출" 누를 때만 lazy load.
  // 모바일 저메모리 환경에서 8MB OpenCV.js + WASM 컴파일이 페이지를 다운시키는 문제 회피.
  const [cvReady, setCvReady] = useState(() => isOpenCvReady());
  const [cvLoading, setCvLoading] = useState(false);
  const [cvPhase, setCvPhase] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 진행률 (0..1, null = indeterminate). CV 로드 + 외곽 검출 전체 단계용.
  const [cvProgress, setCvProgress] = useState<number | null>(null);

  // OCR (카드 정보 추출) 상태
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrResult, setOcrResult] = useState<CardOcrResult | null>(null);
  const [ocrErr, setOcrErr] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);

  // 디스플레이 스케일: 자연 픽셀 → 화면 픽셀
  const scale = imgEl && displayW > 0 ? displayW / imgEl.naturalWidth : 1;

  /* 이미지 변경 시 canvas 사이즈 + 폴백 사각형 ---------------------- */
  useEffect(() => {
    if (!imgEl) return;
    // 컨테이너가 첫 렌더에선 displayW=0 으로 collapse 돼 clientWidth=0 일 수 있음.
    // 그럴 땐 viewport 기반 fallback 사용 → 라인이 너무 작은 캔버스에 그려져 안 보이는 문제 방지.
    const measured = containerRef.current?.clientWidth ?? 0;
    const fallback =
      typeof window !== 'undefined' ? Math.max(280, window.innerWidth - 32) : 360;
    const containerW = measured > 50 ? measured : fallback;
    const w = Math.min(containerW, imgEl.naturalWidth);
    const h = (w / imgEl.naturalWidth) * imgEl.naturalHeight;
    setDisplayW(w);
    setDisplayH(h);

    // 일단 폴백 사각형 — 사용자는 바로 드래그로 조정 가능. CV 는 옵션.
    const fb = fallbackQuads(imgEl.naturalWidth, imgEl.naturalHeight);
    setOuter(fb.outer);
    setInner(fb.inner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  /* 캔버스 그리기 — 이미지만. 외곽/내곽 라인은 SVG 오버레이로 분리. ----- */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !imgEl) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = displayW;
    c.height = displayH;
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(imgEl, 0, 0, displayW, displayH);
  }, [imgEl, displayW, displayH]);

  /* 파일 선택 핸들러 -------------------------------------------- */
  const onFile = (file: File) => {
    setErr(null);
    setOuter(null);
    setInner(null);
    setOcrResult(null);
    setOcrErr(null);
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

  /* 자동 외곽 검출 — OpenCV.js 가 준비됐을 때만 호출 ------------- */
  const runDetection = useCallback((image: HTMLImageElement) => {
    setBusyLabel('외곽 검출 중…');
    setErr(null);
    setCvProgress(null); // 검출 자체는 sync — indeterminate
    setTimeout(() => {
      try {
        const detected = detectOuterQuad(image);
        if (detected) {
          setOuter(detected);
          setInner(shrinkQuad(detected, 0.045));
        } else {
          setErr('외곽 자동 검출 실패 — 핸들로 직접 맞춰주세요');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '검출 실패');
      } finally {
        setBusyLabel(null);
        setCvProgress(null);
      }
    }, 30);
  }, []);

  /* 사용자가 OCR 클릭 → Tesseract.js lazy load + 카드 텍스트 추출 - */
  const onClickRecognize = useCallback(async () => {
    if (!imgEl || ocrLoading) return;
    setOcrErr(null);
    setOcrResult(null);
    setOcrLoading(true);
    setOcrPhase('스크립트 다운로드 준비…');
    setOcrProgress(0);
    try {
      const result = await recognizeCard(imgEl, outer, {
        onProgress: (p) => {
          // 단계별 진행률 매핑 — 전체를 0..1 로 정규화:
          //   load-script   : 0   → 0.10
          //   load-lang     : 0.10 → 0.50  (Tesseract 가 progress 줌)
          //   recognize     : 0.50 → 1.00  (Tesseract 가 progress 줌)
          if (p.phase === 'load-script') {
            setOcrPhase('Tesseract 다운로드 중…');
            setOcrProgress(0.05);
          } else if (p.phase === 'load-lang') {
            const sub = p.progress != null ? Math.round(p.progress * 100) : null;
            setOcrPhase(`언어 데이터 다운로드 중${sub != null ? ` (${sub}%)` : ''} · eng ~10MB`);
            setOcrProgress(0.1 + (p.progress ?? 0) * 0.4);
          } else if (p.phase === 'recognize') {
            const sub = p.progress != null ? Math.round(p.progress * 100) : null;
            setOcrPhase(`텍스트 인식 중${sub != null ? ` (${sub}%)` : ''}`);
            setOcrProgress(0.5 + (p.progress ?? 0) * 0.5);
          }
        },
      });
      setOcrResult(result);
      setOcrProgress(1);
    } catch (e) {
      setOcrErr(
        (e instanceof Error ? e.message : 'OCR 실패') +
          ' — 사진이 흐릿하거나 빛 반사가 심하면 인식이 어려워요',
      );
    } finally {
      setOcrLoading(false);
      setOcrPhase(null);
      setOcrProgress(null);
    }
  }, [imgEl, outer, ocrLoading]);

  /* 사용자가 자동 검출 클릭 → 필요 시 OpenCV lazy load --------- */
  const onClickAutoDetect = useCallback(() => {
    if (!imgEl) return;
    if (cvReady) {
      runDetection(imgEl);
      return;
    }
    setErr(null);
    setCvLoading(true);
    setCvPhase('스크립트 다운로드 중…');
    setCvProgress(0.05);
    loadOpenCv({
      onPhase: (p, info) => {
        // 단계 → 누적 진행률 매핑 (실제 다운로드 progress 이벤트는 없어 이산값):
        //   inject        → 5%   (script 태그 주입)
        //   script-loaded → 60%  (스크립트 다운로드 + 파싱 끝, WASM 초기화 시작)
        //   wasm-ready    → 100% (Mat 사용 가능)
        const cdnTag = info?.host ? ` · ${info.host}` : '';
        const tries =
          info?.attempt && info?.totalAttempts && info.totalAttempts > 1
            ? ` (${info.attempt}/${info.totalAttempts})`
            : '';
        if (p === 'inject') {
          setCvPhase(`OpenCV 다운로드 중${tries}${cdnTag}`);
          setCvProgress(0.05);
        } else if (p === 'script-loaded') {
          setCvPhase(`WASM 초기화 중${tries}${cdnTag}`);
          setCvProgress(0.6);
        } else if (p === 'wasm-ready') {
          setCvPhase('준비 완료');
          setCvProgress(1);
        }
      },
    })
      .then(() => {
        setCvReady(true);
        setCvLoading(false);
        setCvPhase(null);
        setCvProgress(null);
        runDetection(imgEl);
      })
      .catch((e) => {
        setCvLoading(false);
        setCvPhase(null);
        setCvProgress(null);
        setErr(
          (e instanceof Error ? e.message : 'OpenCV 로드 실패') +
            ' — 수동으로 핸들을 드래그해주세요',
        );
      });
  }, [imgEl, cvReady, runDetection]);

  /* 코너 드래그 ------------------------------------------------ */
  const draggingRef = useRef<{ which: 'outer' | 'inner'; idx: 0 | 1 | 2 | 3 } | null>(null);
  // 드래그 중 표시할 돋보기용 상태 (re-render 트리거 — ref 만으로는 안 됨)
  const [dragHandle, setDragHandle] = useState<{ which: 'outer' | 'inner'; idx: 0 | 1 | 2 | 3 } | null>(null);

  const onPointerDown = (which: 'outer' | 'inner', idx: 0 | 1 | 2 | 3) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { which, idx };
    setDragHandle({ which, idx });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current;
    if (!d || !imgEl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // 화면 픽셀 → 자연 좌표 변환은 rect 기준이 가장 정확 (displayW 와 다를 수 있음).
    const px = ((e.clientX - rect.left) / rect.width) * imgEl.naturalWidth;
    const py = ((e.clientY - rect.top) / rect.height) * imgEl.naturalHeight;
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
    setDragHandle(null);
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
            style={mainBtn('var(--blu)')}
          >
            📷 카드 사진 선택 / 촬영
          </button>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.6 }}>
            먼저 사진을 올려주세요 — 그 다음 자동 외곽 검출(선택) 또는 핸들 드래그로 맞춥니다.
          </div>
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

            {/* 외곽/내곽 SVG 오버레이 — viewBox 가 자연 좌표라 캔버스/디스플레이 비율과 무관하게 정확히 맞음.
                vector-effect=non-scaling-stroke 로 어느 줌에서도 항상 일정한 굵기. */}
            {outer && inner && (
              <svg
                viewBox={`0 0 ${imgEl.naturalWidth} ${imgEl.naturalHeight}`}
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {/* 외곽 = 카드 컷 라인 (파랑, 굵음) */}
                <polygon
                  points={quadToPoints(outer)}
                  fill="none"
                  stroke="#3A5BD9"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* 내곽 = 인쇄 프레임 안쪽 (노랑, 점선) */}
                <polygon
                  points={quadToPoints(inner)}
                  fill="none"
                  stroke="#FFD23F"
                  strokeWidth={3}
                  strokeDasharray="8,5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

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
            {/* 외각/내각 거리 라벨 — 4변 미드포인트에 % + px 표시 */}
            {outer && inner && result && marginLabels(outer, inner, scale).map((l) => (
              <MarginLabel
                key={l.side}
                x={l.x}
                y={l.y}
                pct={l.pct}
                px={l.px}
                worst={result.worstAxis === (l.side === 'left' || l.side === 'right' ? 'L/R' : 'T/B')}
              />
            ))}

            {/* 드래그 중 돋보기 — 손가락 위(또는 너무 위면 아래) 에 3x 확대 뷰 */}
            {dragHandle && imgEl && displayW > 0 && (() => {
              const handlePos = dragHandle.which === 'outer'
                ? (outer ? outer[dragHandle.idx] : null)
                : (inner ? inner[dragHandle.idx] : null);
              if (!handlePos) return null;
              return (
                <Loupe
                  imgEl={imgEl}
                  naturalX={handlePos.x}
                  naturalY={handlePos.y}
                  displayX={handlePos.x * scale}
                  displayY={handlePos.y * scale}
                  containerW={displayW}
                  tone={dragHandle.which === 'outer' ? '#3A5BD9' : '#FFD23F'}
                />
              );
            })()}
            {(busyLabel || cvLoading) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  color: 'var(--yel)',
                  fontFamily: 'var(--f1)',
                  fontSize: 10,
                  letterSpacing: 0.5,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <Spinner />
                <div>{cvLoading ? `OpenCV — ${cvPhase ?? '준비 중…'}` : busyLabel}</div>
                <div style={{ width: 'min(260px, 80%)' }}>
                  <ProgressBar value={cvProgress} indeterminate={!cvLoading} />
                </div>
                {cvLoading && (
                  <div style={{ fontSize: 8, opacity: 0.85, lineHeight: 1.6 }}>
                    ~8MB · 모바일 데이터에서 30~60초 걸릴 수 있어요
                    <br />
                    멈춘 듯 보여도 백그라운드에서 진행 중입니다
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClickAutoDetect}
              disabled={cvLoading || !!busyLabel}
              style={{
                ...ctrlBtn('var(--blu)'),
                opacity: cvLoading || !!busyLabel ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {cvLoading ? (
                <>
                  <SpinnerSm /> 로드 중…
                </>
              ) : cvReady ? (
                '🔄 자동 재검출'
              ) : (
                '🪄 외곽 자동 검출'
              )}
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
            <button
              type="button"
              onClick={onClickRecognize}
              disabled={ocrLoading || !!busyLabel}
              style={{
                ...ctrlBtn('var(--pur)'),
                opacity: ocrLoading || !!busyLabel ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {ocrLoading ? (
                <>
                  <SpinnerSm /> OCR…
                </>
              ) : (
                '📖 카드 정보 추출'
              )}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={ctrlBtn('var(--ink2)')}>
              🖼 다른 사진
            </button>
          </div>

          {/* OCR 진행 / 결과 */}
          {(ocrLoading || ocrPhase) && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                background: 'var(--ink)',
                color: 'var(--yel)',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                letterSpacing: 0.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <SpinnerSm />
                <span style={{ flex: 1 }}>{ocrPhase ?? '인식 중…'}</span>
              </div>
              <ProgressBar value={ocrProgress} indeterminate={ocrProgress == null} tone="yellow" />
              <div style={{ marginTop: 6, fontSize: 8, opacity: 0.8 }}>
                하단 영역 (카드번호/세트코드) 만 영문 인식 — 첫 실행 시 ~10MB 다운로드
              </div>
            </div>
          )}
          {ocrErr && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 10px',
                background: 'var(--red)',
                color: 'var(--white)',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                letterSpacing: 0.5,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              ⚠ {ocrErr}
            </div>
          )}
          {ocrResult && <OcrResultCard r={ocrResult} />}

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

/* --------------------------- loupe ----------------------------- */

/**
 * 코너 드래그 중 표시되는 돋보기 — 핸들 주변 영역을 3배 확대해 보여줌.
 * 위치: 핸들 위쪽 GAP 만큼 떨어진 곳, 화면 위쪽이면 아래로 자동 flip.
 * pointer-events:none — 드래그 자체를 방해하지 않음.
 */
function Loupe({
  imgEl,
  naturalX,
  naturalY,
  displayX,
  displayY,
  containerW,
  tone,
}: {
  imgEl: HTMLImageElement;
  naturalX: number;
  naturalY: number;
  displayX: number;
  displayY: number;
  containerW: number;
  tone: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const SIZE = 140;
  const ZOOM = 3;
  const SRC_SIDE = SIZE / ZOOM; // 약 47px 영역을 3배 확대

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // 가장자리에 가까울 때 source 가 음수가 될 수 있어 검은 배경 채우고 그 위에 그림
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingQuality = 'high';
    const sx = naturalX - SRC_SIDE / 2;
    const sy = naturalY - SRC_SIDE / 2;
    try {
      ctx.drawImage(imgEl, sx, sy, SRC_SIDE, SRC_SIDE, 0, 0, SIZE, SIZE);
    } catch {
      // sx/sy 가 음수 + sw/sh 양수 이면 일부 브라우저는 OK, 일부는 throw — fallback 없이 패스
    }
  }, [imgEl, naturalX, naturalY]);

  // 위치 계산: 손가락 위 GAP px, 위쪽 공간 부족하면 아래로 flip, 좌우는 컨테이너 안으로 클램프
  const SAFE = 8;
  const GAP = 40;
  let lx = displayX - SIZE / 2;
  let ly = displayY - SIZE - GAP;
  if (ly < SAFE) ly = displayY + GAP;
  lx = Math.max(SAFE, Math.min(containerW - SIZE - SAFE, lx));

  return (
    <div
      style={{
        position: 'absolute',
        left: lx,
        top: ly,
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 0 0 3px var(--ink), 0 0 0 5px var(--white), 0 6px 14px rgba(0,0,0,.6)',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <canvas ref={ref} style={{ display: 'block', width: SIZE, height: SIZE }} />
      {/* crosshair */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.7)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.7)' }} />
      {/* center precision dot */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: `2px solid ${tone}`,
          background: 'transparent',
          boxShadow: '0 0 0 1px rgba(0,0,0,.5)',
        }}
      />
      {/* 줌 표시 */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 8,
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'rgba(255,255,255,.85)',
          background: 'rgba(0,0,0,.5)',
          padding: '1px 4px',
          letterSpacing: 0.3,
        }}
      >
        ×{ZOOM}
      </div>
    </div>
  );
}

/* --------------------- margin distance labels ------------------ */

interface MarginLabelInfo {
  side: 'left' | 'right' | 'top' | 'bottom';
  /** 화면 픽셀 좌표 (라벨 중심) */
  x: number;
  y: number;
  /** 가까운 변 비율 (이 변의 여백 %) */
  pct: number;
  /** 픽셀 단위 여백 (이미지 자연 좌표) */
  px: number;
}

function marginLabels(outer: Quad, inner: Quad, scale: number): MarginLabelInfo[] {
  // 외곽/내곽 각 변의 평균 좌표 (이미지 자연 좌표)
  const oLx = (outer[0].x + outer[3].x) / 2;
  const oRx = (outer[1].x + outer[2].x) / 2;
  const oTy = (outer[0].y + outer[1].y) / 2;
  const oBy = (outer[2].y + outer[3].y) / 2;
  const iLx = (inner[0].x + inner[3].x) / 2;
  const iRx = (inner[1].x + inner[2].x) / 2;
  const iTy = (inner[0].y + inner[1].y) / 2;
  const iBy = (inner[2].y + inner[3].y) / 2;

  const leftMpx = iLx - oLx;
  const rightMpx = oRx - iRx;
  const topMpx = iTy - oTy;
  const bottomMpx = oBy - iBy;

  const lrTotal = Math.max(0.001, leftMpx + rightMpx);
  const tbTotal = Math.max(0.001, topMpx + bottomMpx);
  const leftPct = Math.round(clamp(leftMpx / lrTotal, 0, 1) * 100);
  const rightPct = 100 - leftPct;
  const topPct = Math.round(clamp(topMpx / tbTotal, 0, 1) * 100);
  const bottomPct = 100 - topPct;

  // 카드 무게중심 → T/B 라벨의 X, L/R 라벨의 Y
  const cx = ((outer[0].x + outer[1].x + outer[2].x + outer[3].x) / 4) * scale;
  const cy = ((outer[0].y + outer[1].y + outer[2].y + outer[3].y) / 4) * scale;

  return [
    { side: 'left',   x: ((oLx + iLx) / 2) * scale, y: cy, pct: leftPct,   px: Math.max(0, Math.round(leftMpx)) },
    { side: 'right',  x: ((oRx + iRx) / 2) * scale, y: cy, pct: rightPct,  px: Math.max(0, Math.round(rightMpx)) },
    { side: 'top',    x: cx, y: ((oTy + iTy) / 2) * scale, pct: topPct,    px: Math.max(0, Math.round(topMpx)) },
    { side: 'bottom', x: cx, y: ((oBy + iBy) / 2) * scale, pct: bottomPct, px: Math.max(0, Math.round(bottomMpx)) },
  ];
}

function MarginLabel({ x, y, pct, px, worst }: { x: number; y: number; pct: number; px: number; worst?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        background: worst ? 'var(--red)' : 'rgba(0,0,0,.85)',
        color: 'var(--white)',
        padding: '3px 6px',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
        pointerEvents: 'none', // 핸들 드래그 방해 안 하게
        boxShadow: '1px 1px 0 var(--ink)',
        lineHeight: 1.3,
      }}
    >
      <span style={{ fontWeight: 700 }}>{pct}%</span>
      <span style={{ opacity: 0.75, marginLeft: 4 }}>{px}px</span>
    </div>
  );
}

/* ---------------------------- progress bar --------------------- */

/**
 * 픽셀 스타일 진행바.
 * - value: 0..1 (또는 null + indeterminate 로 줄무늬 애니메이션)
 * - tone: 'red' (CV) | 'yellow' (OCR) — 채움색.
 */
function ProgressBar({
  value,
  indeterminate,
  tone = 'red',
}: {
  value?: number | null;
  indeterminate?: boolean;
  tone?: 'red' | 'yellow';
}) {
  const pct = indeterminate || value == null ? null : Math.round(Math.max(0, Math.min(1, value)) * 100);
  const fillColor = tone === 'yellow' ? 'var(--yel)' : 'var(--red)';

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: 12,
          background: 'rgba(255,255,255,.15)',
          border: '2px solid currentColor',
          overflow: 'hidden',
        }}
      >
        {pct == null ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(45deg, ${fillColor} 0 8px, transparent 8px 16px)`,
              backgroundSize: '32px 32px',
              animation: 'pf-pb-indet 0.6s linear infinite',
              opacity: 0.85,
            }}
          />
        ) : (
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: fillColor,
              transition: 'width 200ms linear',
            }}
          />
        )}
      </div>
      {pct != null && (
        <div
          style={{
            marginTop: 4,
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'right',
            color: 'currentColor',
          }}
        >
          {pct}%
        </div>
      )}
    </div>
  );
}

/* ---------------------------- spinners -------------------------- */

function Spinner() {
  // 포켓볼 스타일 큰 스피너 — 페이지 전체 로딩에 사용
  return (
    <div
      aria-hidden
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '3px solid var(--ink)',
        background:
          'linear-gradient(to bottom,var(--red) 0,var(--red) 46%,var(--ink) 46%,var(--ink) 54%,var(--white) 54%,var(--white) 100%)',
        animation: 'pf-ball-spin 0.8s linear infinite',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--white)',
          border: '2px solid var(--ink)',
          transform: 'translate(-50%,-50%)',
        }}
      />
    </div>
  );
}

function SpinnerSm() {
  // 버튼 안에 들어가는 작은 스피너
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'pf-ball-spin 0.8s linear infinite',
        verticalAlign: 'middle',
      }}
    />
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

function OcrResultCard({ r }: { r: CardOcrResult }) {
  const [showRaw, setShowRaw] = useState(false);
  const numLabel = r.cardNumber ? `${r.cardNumber.left} / ${r.cardNumber.right}` : '—';
  const found =
    !!r.cardNumber || !!r.setCode || !!r.promoCode || !!r.illustrator;
  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        background: 'var(--white)',
        boxShadow:
          '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 10,
          letterSpacing: 0.5,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        📖 카드 정보 추출 결과
      </div>

      {!found && (
        <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', textAlign: 'center', padding: 12 }}>
          카드 번호/세트 코드를 찾지 못했어요.
          <br />
          하단 영역이 잘 안 보이거나 번호 자리가 외곽 밖이면 외곽 사각형을 더 정확히 맞춰주세요.
        </div>
      )}

      {found && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KvRow k="카드 번호" v={numLabel} highlight={!!r.cardNumber} />
          {r.setCode && <KvRow k="세트 코드" v={r.setCode} highlight />}
          {r.promoCode && <KvRow k="프로모 코드" v={r.promoCode} highlight />}
          {r.illustrator && <KvRow k="일러스트레이터" v={r.illustrator} />}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--blu)',
            letterSpacing: 0.3,
            padding: 0,
          }}
        >
          {showRaw ? '▲ 원본 OCR 텍스트 숨김' : '▼ 원본 OCR 텍스트 보기'}
        </button>
        {r.cardNumber && (
          <a
            href={`/cards/search?q=${encodeURIComponent(r.cardNumber.raw)}`}
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--white)',
              background: 'var(--blu)',
              padding: '4px 8px',
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            🔍 시세 검색 ▶
          </a>
        )}
      </div>

      {showRaw && (
        <pre
          style={{
            marginTop: 8,
            padding: 8,
            background: 'var(--pap2)',
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'var(--ink)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {r.rawText || '(빈 텍스트)'}
        </pre>
      )}

      <div style={{ marginTop: 8, fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', lineHeight: 1.6 }}>
        ⚠ OCR 자동 추출 — 이름은 OCR 정확도 한계로 오타가 있을 수 있어요. 번호로 시세를 조회하는 게 정확합니다.
      </div>
    </div>
  );
}

function KvRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <div style={{ minWidth: 80, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: 0.3 }}>
        {k}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: 'var(--f1)',
          fontSize: highlight ? 13 : 11,
          fontWeight: highlight ? 700 : 400,
          color: highlight ? 'var(--red)' : 'var(--ink)',
          letterSpacing: 0.3,
          wordBreak: 'break-all',
        }}
      >
        {v}
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

/** SVG <polygon points="..."> 문자열 — quad 4점을 자연 좌표로. */
function quadToPoints(q: Quad): string {
  return q.map((p) => `${p.x},${p.y}`).join(' ');
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
 *
 * 파이프라인:
 *  1. 다운스케일 (long side 1200px) — 임계값 일관성 + 속도
 *  2. 그레이스케일 + Gaussian blur
 *  3. Otsu 로 임계값 자동 도출 → Canny(otsu*0.5, otsu) — 카드 색/배경 색 무관 적응
 *  4. morphologyEx CLOSE (5×5) — 라운드 모서리에서 끊긴 엣지 메움
 *  5. findContours
 *  6. 각 큰 contour: 4점 approxPolyDP 시도, 실패하면 minAreaRect 회전 사각형 fallback
 *  7. 카드 종횡비(63:88 ≈ 0.716) 와 면적으로 후보들 점수화 → 베스트 선택
 *  8. cornerSubPix 로 sub-pixel 보정
 *  9. 다운스케일 비율 만큼 원본 좌표로 복원
 *
 * 실패 시 null. 모든 Mat 누수 방지를 위해 try/finally + delete 명시.
 */
function detectOuterQuad(img: HTMLImageElement): Quad | null {
  if (typeof window === 'undefined') return null;
  const cv = (window as unknown as { cv?: CvLike }).cv;
  if (!cv || !cv.Mat) return null;

  // Pokemon TCG 카드 종횡비 (단변/장변)
  const TARGET_RATIO = 63 / 88;
  // 처리용 다운스케일 — 긴 변 이 값까지로 줄임
  const PROC_LONG_SIDE = 1200;

  const src = cv.imread(img);
  const proc = new cv.Mat();
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const otsuBin = new cv.Mat();
  const edges = new cv.Mat();
  const closed = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let kernel: CvMat | null = null;
  let cornersMat: CvMat | null = null;

  try {
    // 1. 다운스케일
    const longSide = Math.max(src.rows, src.cols);
    const procScale = longSide > PROC_LONG_SIDE ? PROC_LONG_SIDE / longSide : 1;
    if (procScale < 1) {
      const newW = Math.round(src.cols * procScale);
      const newH = Math.round(src.rows * procScale);
      cv.resize(src, proc, new cv.Size(newW, newH), 0, 0, cv.INTER_AREA);
    } else {
      src.copyTo(proc);
    }

    // 2. 그레이스케일 + 노이즈 완화
    cv.cvtColor(proc, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

    // 3. Otsu 로 임계값 자동 도출 → Canny 의 high 값으로 사용 (카드/배경 명도 차이에 적응)
    const otsu = cv.threshold(blurred, otsuBin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    const high = Math.max(60, otsu);
    const low = Math.max(20, high * 0.5);
    cv.Canny(blurred, edges, low, high, 3, false);

    // 4. 모폴로지 close — 5x5 로 라운드 모서리 끊김 메움
    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);

    // 5. 외곽선 검출
    cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // 6. 후보 수집 — 각 contour 에서 approxPolyDP 4점 또는 minAreaRect
    interface Candidate {
      pts: Pt[];
      area: number;
    }
    const candidates: Candidate[] = [];
    const minArea = proc.rows * proc.cols * 0.1;
    const maxArea = proc.rows * proc.cols * 0.99;

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i) as CvMat;
      const area = cv.contourArea(c, false);
      if (area < minArea || area > maxArea) {
        c.delete();
        continue;
      }
      const peri = cv.arcLength(c, true);

      // 6a. approxPolyDP 4점 시도 — 둥근 모서리에 대응해 ε 두 단계 시도
      let added = false;
      for (const eps of [0.02, 0.04]) {
        const approx = new cv.Mat();
        cv.approxPolyDP(c, approx, peri * eps, true);
        if (approx.rows === 4) {
          const pts: Pt[] = [];
          for (let j = 0; j < 4; j++) {
            pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
          }
          candidates.push({ pts, area });
          approx.delete();
          added = true;
          break;
        }
        approx.delete();
      }

      // 6b. 4점 못 얻으면 minAreaRect 회전 사각형 — 라운드/노이즈 contour 대응
      if (!added) {
        try {
          const rotRect = cv.minAreaRect(c);
          const corners = rotatedRectCorners(rotRect);
          // 회전 사각형 면적 = w*h
          const rArea = rotRect.size.width * rotRect.size.height;
          if (rArea >= minArea && rArea <= maxArea) {
            candidates.push({ pts: corners, area: rArea });
          }
        } catch {
          // minAreaRect 가 실패하면 skip
        }
      }
      c.delete();
    }

    if (candidates.length === 0) return null;

    // 7. 종횡비 + 면적 기반 점수 — 카드 비율(0.716) 에 가까울수록, 면적이 클수록 좋음
    const imgArea = proc.rows * proc.cols;
    let best: Candidate | null = null;
    let bestScore = -Infinity;
    for (const cand of candidates) {
      const ordered = orderCorners(cand.pts);
      const w = (edgeLen(ordered[0], ordered[1]) + edgeLen(ordered[3], ordered[2])) / 2;
      const h = (edgeLen(ordered[0], ordered[3]) + edgeLen(ordered[1], ordered[2])) / 2;
      if (w <= 0 || h <= 0) continue;
      const ratio = Math.min(w, h) / Math.max(w, h);
      const ratioScore = 1 - Math.min(0.5, Math.abs(ratio - TARGET_RATIO) * 2);
      const areaScore = Math.min(1, cand.area / imgArea);
      const score = ratioScore * 0.6 + areaScore * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = { ...cand, pts: ordered };
      }
    }

    if (!best) return null;

    // 8. cornerSubPix 로 sub-pixel 보정
    cornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, best.pts.flatMap((p) => [p.x, p.y]));
    try {
      const winSize = new cv.Size(11, 11);
      const zeroZone = new cv.Size(-1, -1);
      const criteria = new cv.TermCriteria(
        cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
        30,
        0.01,
      );
      cv.cornerSubPix(gray, cornersMat, winSize, zeroZone, criteria);
    } catch {
      // 실패해도 거친 값으로 진행
    }

    const refined: Pt[] = [];
    const data = cornersMat.data32F;
    for (let i = 0; i < 4; i++) {
      refined.push({ x: data[i * 2], y: data[i * 2 + 1] });
    }

    // 9. 다운스케일했으면 원본 좌표로 복원
    const inv = procScale < 1 ? 1 / procScale : 1;
    const original = refined.map((p) => ({ x: p.x * inv, y: p.y * inv }));
    return orderCorners(original);
  } finally {
    src.delete();
    proc.delete();
    gray.delete();
    blurred.delete();
    otsuBin.delete();
    edges.delete();
    closed.delete();
    contours.delete();
    hierarchy.delete();
    if (kernel) kernel.delete();
    if (cornersMat) cornersMat.delete();
  }
}

function edgeLen(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * cv.RotatedRect → 4개 꼭짓점 변환. cv.boxPoints 를 직접 호출하는 대신 수학으로 계산해서
 * Mat 추가 할당 / 타입 선언 부담을 줄임.
 */
function rotatedRectCorners(rect: { center: { x: number; y: number }; size: { width: number; height: number }; angle: number }): Pt[] {
  const cx = rect.center.x;
  const cy = rect.center.y;
  const w = rect.size.width;
  const h = rect.size.height;
  const a = (rect.angle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = w / 2;
  const dy = h / 2;
  // 회전 사각형 4 꼭짓점 (TL, TR, BR, BL — orderCorners 가 다시 정렬하므로 순서는 임의)
  return [
    { x: cx - dx * cos + dy * sin, y: cy - dx * sin - dy * cos },
    { x: cx + dx * cos + dy * sin, y: cy + dx * sin - dy * cos },
    { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos },
    { x: cx - dx * cos - dy * sin, y: cy - dx * sin + dy * cos },
  ];
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
  data32F: Float32Array;
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
interface CvPoint {
  x: number;
  y: number;
}
interface CvScalar {
  val: number[];
}
interface CvTermCriteria {
  type: number;
  maxCount: number;
  epsilon: number;
}
interface CvRotatedRect {
  center: { x: number; y: number };
  size: { width: number; height: number };
  angle: number;
}
interface CvMatExt extends CvMat {
  copyTo: (dst: CvMat) => void;
}
interface CvLike {
  Mat: new () => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (w: number, h: number) => CvSize;
  Point: new (x: number, y: number) => CvPoint;
  TermCriteria: new (type: number, maxCount: number, epsilon: number) => CvTermCriteria;
  imread: (img: HTMLImageElement | HTMLCanvasElement) => CvMatExt;
  matFromArray: (rows: number, cols: number, type: number, data: number[]) => CvMat;
  cvtColor: (src: CvMat, dst: CvMat, code: number, dstCn?: number) => void;
  resize: (src: CvMat, dst: CvMat, dsize: CvSize, fx?: number, fy?: number, interpolation?: number) => void;
  GaussianBlur: (src: CvMat, dst: CvMat, ksize: CvSize, sX: number, sY?: number, borderType?: number) => void;
  Canny: (src: CvMat, dst: CvMat, t1: number, t2: number, apertureSize?: number, L2gradient?: boolean) => void;
  dilate: (
    src: CvMat,
    dst: CvMat,
    kernel: CvMat,
    anchor: CvPoint,
    iterations: number,
    borderType: number,
    borderValue: CvScalar,
  ) => void;
  morphologyEx: (src: CvMat, dst: CvMat, op: number, kernel: CvMat) => void;
  getStructuringElement: (shape: number, ksize: CvSize) => CvMat;
  morphologyDefaultBorderValue: () => CvScalar;
  threshold: (src: CvMat, dst: CvMat, thresh: number, max: number, type: number) => number;
  findContours: (src: CvMat, contours: CvMatVector, hier: CvMat, mode: number, method: number) => void;
  contourArea: (c: CvMat, oriented?: boolean) => number;
  arcLength: (c: CvMat, closed: boolean) => number;
  approxPolyDP: (c: CvMat, dst: CvMat, eps: number, closed: boolean) => void;
  minAreaRect: (c: CvMat) => CvRotatedRect;
  cornerSubPix: (
    src: CvMat,
    corners: CvMat,
    winSize: CvSize,
    zeroZone: CvSize,
    criteria: CvTermCriteria,
  ) => void;
  COLOR_RGBA2GRAY: number;
  BORDER_DEFAULT: number;
  BORDER_CONSTANT: number;
  THRESH_BINARY: number;
  THRESH_OTSU: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  MORPH_RECT: number;
  MORPH_CLOSE: number;
  INTER_AREA: number;
  CV_32FC2: number;
  TERM_CRITERIA_EPS: number;
  TERM_CRITERIA_MAX_ITER: number;
}

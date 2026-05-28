'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CardMatchPanel } from './CardMatchPanel';
import { recognizeCard, type CardOcrResult, type ScanCandidate } from './cardOcr';
import { detectCardOuterPureJs } from './pureCardDetect';
import { lookupPokemonSet } from '../../../shared/data/pokemonSetMap';

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
  // 외곽 검출은 순수 JS — 다운로드 0bytes, 즉시 실행. OpenCV 의존성 제거됨.
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // OCR (카드 정보 추출) 상태
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrResult, setOcrResult] = useState<CardOcrResult | null>(null);
  const [ocrErr, setOcrErr] = useState<string | null>(null);
  // 카드 이름 언어 — 모바일 스캔 화면(scan.tsx)과 동일한 한/일/영 토글.
  // 서버 OCR 워커를 한 언어로만 돌려 정확도 ↑ + 일본판 일러스트 fallback 회피.
  const [scanLang, setScanLang] = useState<'ko' | 'jp' | 'en'>('ko');
  // 사용자가 한 번이라도 핸들을 드래그했으면 true — AI quads 로 덮어쓰지 않게.
  const userAdjustedRef = useRef(false);
  // 같은 이미지에 대해 자동 OCR 을 한 번만 트리거하기 위한 신호.
  const autoOcrFiredRef = useRef<HTMLImageElement | null>(null);
  // 사용자가 후보 리스트에서 고른 카드 — 저장 시 그 candidate 의 snkrdunkApparelId
  // / 이미지 / 이름까지 같이 POST 한다 (없으면 내 컬렉션에서 이미지/시세 안 따라옴).
  const [selectedCandidate, setSelectedCandidate] = useState<ScanCandidate | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);

  // 디스플레이 스케일: 자연 픽셀 → 화면 픽셀
  const scale = imgEl && displayW > 0 ? displayW / imgEl.naturalWidth : 1;

  /* 이미지 변경 시 canvas 사이즈 + 폴백 사각형 + 즉시 외곽 자동검출 + 자동 OCR */
  useEffect(() => {
    if (!imgEl) return;
    // 새 이미지 — 사용자 조정 플래그 리셋, 자동 OCR 트리거 새로 부여.
    userAdjustedRef.current = false;

    const measured = containerRef.current?.clientWidth ?? 0;
    const fallback =
      typeof window !== 'undefined' ? Math.max(280, window.innerWidth - 32) : 360;
    const containerW = measured > 50 ? measured : fallback;
    const w = Math.min(containerW, imgEl.naturalWidth);
    const h = (w / imgEl.naturalWidth) * imgEl.naturalHeight;
    setDisplayW(w);
    setDisplayH(h);

    // 일단 폴백 사각형 — 사용자는 바로 드래그로 조정 가능.
    const fb = fallbackQuads(imgEl.naturalWidth, imgEl.naturalHeight);
    setOuter(fb.outer);
    setInner(fb.inner);

    // pure JS 외곽 검출 — 30ms 정도라 부담 없음. 결과 있으면 outer/inner 갱신.
    try {
      const detected = detectCardOuterPureJs(imgEl);
      if (detected && !userAdjustedRef.current) {
        setOuter(detected);
        setInner(shrinkQuad(detected, 0.045));
      }
    } catch {
      // ignore — 폴백 사각형 그대로
    }
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

  /* 자동 외곽 검출 — 순수 JS, 외부 라이브러리/CDN 의존 없음 ----- */
  const runDetection = useCallback((image: HTMLImageElement) => {
    setBusyLabel('외곽 검출 중…');
    setErr(null);
    // 짧은 setTimeout — UI 가 spinner 보여줄 시간 확보 (검출 자체는 ~30ms 면 끝)
    setTimeout(() => {
      try {
        const detected = detectCardOuterPureJs(image);
        if (detected) {
          setOuter(detected);
          setInner(shrinkQuad(detected, 0.045));
        } else {
          setErr('외곽 자동 검출 실패 — 핸들로 4모서리를 카드에 맞춰 끌어 보거나, 그대로 OCR 시도(전체 이미지) 가능합니다.');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '검출 실패');
      } finally {
        setBusyLabel(null);
      }
    }, 30);
  }, []);

  /* 이미지가 바뀌면 자동으로 OCR 한 번 — 사용자가 굳이 "📖 카드 정보 추출" 을
     누르지 않아도 카드가 뜨자마자 결과·후보·시세가 같이 표시된다. 같은 imgEl
     에 대해선 한 번만 (autoOcrFiredRef 가 그 인스턴스를 기억). */
  useEffect(() => {
    if (!imgEl) return;
    if (autoOcrFiredRef.current === imgEl) return;
    autoOcrFiredRef.current = imgEl;
    // 외곽 자동 검출이 끝나길 한 프레임 기다림 — outer state 가 반영된 뒤 호출.
    const t = window.setTimeout(() => {
      onClickRecognize();
    }, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  /* 사용자가 OCR 클릭 → 서버 (/api/cards/scan) 로 업로드 + AI 카드 정보 추출. */
  const onClickRecognize = useCallback(async () => {
    if (!imgEl || ocrLoading) return;
    setOcrErr(null);
    setOcrResult(null);
    setOcrLoading(true);
    setOcrPhase('카드 영역 준비…');
    setOcrProgress(0);

    // 서버는 단일 호출이라 실제 진행 이벤트가 없음 → upload 완료 후 processing
    // 단계에서 80% 까지 자동 크리프 (앱과 동일한 UX). 응답 도착 시 100% 도달.
    let creepTimer: ReturnType<typeof setInterval> | null = null;
    try {
      const result = await recognizeCard(imgEl, outer, {
        language: scanLang,
        useAi: true,
        onProgress: (p) => {
          if (p.phase === 'crop') {
            setOcrPhase('카드 영역 자르는 중…');
            setOcrProgress(0.05);
          } else if (p.phase === 'upload') {
            setOcrPhase('서버로 업로드 중…');
            setOcrProgress(0.25);
          } else if (p.phase === 'processing') {
            setOcrPhase('AI 카드 정보 인식 중…');
            setOcrProgress(0.4);
            if (!creepTimer) {
              creepTimer = setInterval(() => {
                setOcrProgress((cur) => {
                  if (cur == null) return cur;
                  if (cur >= 0.85) return cur;
                  return Math.min(0.85, cur + 0.03);
                });
              }, 600);
            }
          } else if (p.phase === 'done') {
            setOcrProgress(1);
          }
        },
      });
      setOcrResult(result);
      setOcrProgress(1);
      // 첫 후보 자동 선택 — 저장 시 이 candidate 의 snkrdunk/이미지/이름이 같이 박힘.
      setSelectedCandidate(result.candidates[0] ?? null);
      // AI 가 quads 를 안정적으로 돌려줬고 사용자가 핸들 만지기 전이면 자동 적용.
      // sanity 는 서버에서 이미 통과 — 여기선 단순 null 체크만.
      if (!userAdjustedRef.current) {
        if (result.outerQuad) setOuter(result.outerQuad);
        if (result.innerQuad) setInner(result.innerQuad);
      }
    } catch (e) {
      setOcrErr(
        (e instanceof Error ? e.message : 'OCR 실패') +
          ' — 사진이 흐릿하거나 빛 반사가 심하면 인식이 어려워요',
      );
    } finally {
      if (creepTimer) clearInterval(creepTimer);
      setOcrLoading(false);
      setOcrPhase(null);
      setOcrProgress(null);
    }
  }, [imgEl, outer, ocrLoading, scanLang]);

  /* 사용자가 자동 검출 클릭 — 즉시 순수 JS 검출 실행 ----------- */
  const onClickAutoDetect = useCallback(() => {
    if (!imgEl) return;
    runDetection(imgEl);
  }, [imgEl, runDetection]);

  /* 코너 드래그 ------------------------------------------------ */
  const draggingRef = useRef<{ which: 'outer' | 'inner'; idx: 0 | 1 | 2 | 3 } | null>(null);
  // 드래그 중 표시할 돋보기용 상태 (re-render 트리거 — ref 만으로는 안 됨)
  const [dragHandle, setDragHandle] = useState<{ which: 'outer' | 'inner'; idx: 0 | 1 | 2 | 3 } | null>(null);

  const onPointerDown = (which: 'outer' | 'inner', idx: 0 | 1 | 2 | 3) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // 사용자가 직접 조정 — 이후 AI quads 응답으로 덮어쓰지 않게 신호.
    userAdjustedRef.current = true;
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
          fontSize: 10,
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
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.6 }}>
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
            fontSize: 10,
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
            {busyLabel && (
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
                  fontSize: 11,
                  letterSpacing: 0.5,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <Spinner />
                <div>{busyLabel}</div>
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClickAutoDetect}
              disabled={!!busyLabel}
              style={{
                ...ctrlBtn('var(--blu)'),
                opacity: busyLabel ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {busyLabel ? (
                <>
                  <SpinnerSm /> 검출 중…
                </>
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

          {/* 카드 이름 언어 — 모바일 scan.tsx 와 동일한 한/일/영 토글. 서버 OCR 워커를
              한 언어로만 돌려 정확도 ↑ + 일본판 일러스트 fallback 회피. */}
          <div
            style={{
              display: 'flex',
              border: '2px solid var(--ink)',
              background: 'var(--white)',
              marginBottom: 4,
            }}
          >
            {(
              [
                { v: 'ko' as const, label: '한국어' },
                { v: 'jp' as const, label: '일본어' },
                { v: 'en' as const, label: 'English' },
              ]
            ).map((opt, i) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setScanLang(opt.v)}
                disabled={ocrLoading}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: scanLang === opt.v ? 'var(--gold)' : 'transparent',
                  color: scanLang === opt.v ? 'var(--ink)' : 'var(--ink3)',
                  fontFamily: 'var(--f1)',
                  fontSize: 11,
                  letterSpacing: 0.3,
                  border: 'none',
                  borderLeft: i === 0 ? 'none' : '2px solid var(--ink)',
                  cursor: ocrLoading ? 'default' : 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div
            style={{
              marginBottom: 12,
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 0.3,
            }}
          >
            카드 이름이 어느 언어인지 골라주세요 — OCR 정확도와 시세 매칭에 영향
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
                fontSize: 10,
                letterSpacing: 0.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <SpinnerSm />
                <span style={{ flex: 1 }}>{ocrPhase ?? '인식 중…'}</span>
              </div>
              <ProgressBar value={ocrProgress} indeterminate={ocrProgress == null} tone="yellow" />
              <div style={{ marginTop: 6, fontSize: 9, opacity: 0.8 }}>
                AI Vision 으로 카드 이름/번호/세트/희귀도 추출 — 모바일 앱과 동일한 서버
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
                fontSize: 10,
                letterSpacing: 0.5,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              ⚠ {ocrErr}
            </div>
          )}
          {ocrResult && <OcrResultCard r={ocrResult} />}

          {/* 서버가 돌려준 매칭 후보 (이미지 + 다지역 가격 + Snkrdunk) — 앱과 동일 UI */}
          {ocrResult && ocrResult.candidates.length > 0 && (
            <ScanCandidatesPanel
              candidates={ocrResult.candidates}
              selectedId={selectedCandidate?.id ?? null}
              onSelect={setSelectedCandidate}
            />
          )}

          {/* OCR 결과를 카탈로그에 매칭해 시세/차트 표시 + 내 카드에 저장 */}
          <CardMatchPanel
            ocr={ocrResult}
            gradeLabel={result?.band.label ?? null}
            centeringScore={result?.worstCloser ?? null}
            selectedCandidate={selectedCandidate}
          />

          {/* 결과 */}
          {result && <ResultCard r={result} />}

          {/* 범례 */}
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', lineHeight: 1.7 }}>
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
  // ZOOM 의미: "현재 화면에 보이는 사진 대비" 의 확대율 (1.0 = 동일, 2.0 = 2배 큼)
  // 사진 자연 크기 vs 화면 크기를 모르면 SRC_SIDE 가 잘못 계산돼 항상 과확대됨 — 이전 버그.
  const ZOOM_OF_DISPLAY = 1.5;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // display scale: 화면에 1px = 자연 (1/displayScale) px
    const displayScale = containerW > 0 ? containerW / imgEl.naturalWidth : 1;
    // 자연 픽셀로 본 source side. ZOOM_OF_DISPLAY 배만큼 화면보다 크게 보이려면
    // SRC_SIDE = SIZE / (displayScale * ZOOM_OF_DISPLAY)
    const srcSide = Math.max(20, SIZE / Math.max(0.001, displayScale * ZOOM_OF_DISPLAY));
    // 가장자리에 가까울 때 source 가 음수가 될 수 있어 검은 배경 채우고 그 위에 그림
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingQuality = 'high';
    const sx = naturalX - srcSide / 2;
    const sy = naturalY - srcSide / 2;
    try {
      ctx.drawImage(imgEl, sx, sy, srcSide, srcSide, 0, 0, SIZE, SIZE);
    } catch {
      // sx/sy 가 음수 + sw/sh 양수 이면 일부 브라우저는 OK, 일부는 throw — fallback 없이 패스
    }
  }, [imgEl, naturalX, naturalY, containerW]);

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
          fontSize: 9,
          color: 'rgba(255,255,255,.85)',
          background: 'rgba(0,0,0,.5)',
          padding: '1px 4px',
          letterSpacing: 0.3,
        }}
      >
        ×{ZOOM_OF_DISPLAY}
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
        fontSize: 9,
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
            fontSize: 10,
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
      className="pf-pokeball-spinner"
      style={{
        width: 44,
        height: 44,
        animation: 'pf-ball-spin 0.8s linear infinite',
      }}
    />
  );
}

function SpinnerSm() {
  // 버튼 안에 들어가는 작은 스피너
  return (
    <span
      aria-hidden
      className="pf-pokeball-spinner pf-pokeball-spinner--xs"
      style={{ verticalAlign: 'middle' }}
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
          fontSize: 13,
          letterSpacing: 0.5,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        ▶ 추정 등급: <b>{r.band.label}</b>
      </div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', lineHeight: 1.6, textAlign: 'center' }}>
        센터링 한 항목 기준. 코너 / 표면 / 인쇄 결함은 별도.
      </div>
    </div>
  );
}

function OcrResultCard({ r }: { r: CardOcrResult }) {
  const [showRaw, setShowRaw] = useState(false);
  const numLabel = r.cardNumber
    ? r.cardNumber.right
      ? `${r.cardNumber.left} / ${r.cardNumber.right}`
      : r.cardNumber.left
    : '—';
  const nameLabel =
    r.name && r.nameJa && r.name !== r.nameJa
      ? `${r.name} (${r.nameJa})`
      : r.name ?? r.nameJa ?? null;
  const found =
    !!r.cardNumber || !!r.setCode || !!r.promoCode || !!r.illustrator || !!r.name;
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
          fontSize: 11,
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
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', textAlign: 'center', padding: 12 }}>
          카드 번호/세트 코드를 찾지 못했어요.
          <br />
          하단 영역이 잘 안 보이거나 번호 자리가 외곽 밖이면 외곽 사각형을 더 정확히 맞춰주세요.
        </div>
      )}

      {found && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nameLabel && <KvRow k="카드 이름" v={nameLabel} highlight />}
          <KvRow k="카드 번호" v={numLabel} highlight={!!r.cardNumber} />
          {r.setCode && <KvRow k="세트 코드" v={r.setCode} highlight />}
          {r.promoCode && r.promoCode !== r.setCode && (
            <KvRow k="프로모 코드" v={r.promoCode} highlight />
          )}
          {r.rarity && <KvRow k="희귀도" v={r.rarity} />}
          {r.language && r.language !== 'unknown' && (
            <KvRow k="언어" v={r.language.toUpperCase()} />
          )}
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
            fontSize: 10,
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
              fontSize: 10,
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
            fontSize: 10,
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

      <div style={{ marginTop: 8, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', lineHeight: 1.6 }}>
        ⚠ OCR 자동 추출 — 이름은 OCR 정확도 한계로 오타가 있을 수 있어요. 번호로 시세를 조회하는 게 정확합니다.
      </div>
    </div>
  );
}

/* --------------------- scan candidates (server) ------------------ */

/**
 * 서버 (/api/cards/scan) 가 돌려준 카드 후보 리스트 패널 — 모바일 ScanPreview 의
 * CandidateRow 와 동일한 정보(이미지 + 다지역 가격 + Snkrdunk 매칭) 를 보여준다.
 * 사용자가 카드를 고를 수 있도록 row 를 클릭 가능하게 만들었지만, 현재 웹에서는
 * "선택" 자체가 다음 동작에 연결되어 있지 않아 시각적 강조만.
 */
function ScanCandidatesPanel({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: ScanCandidate[];
  selectedId: string | null;
  onSelect: (c: ScanCandidate) => void;
}) {
  return (
    <div className="form-sect">
      <div className="form-label">🤖 AI 매칭 후보 ({candidates.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {candidates.map((c) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            selected={selectedId === c.id}
            onClick={() => onSelect(c)}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink3)',
          letterSpacing: 0.3,
          lineHeight: 1.6,
        }}
      >
        💡 후보는 서버가 TCGdex / 로컬 DB / Snkrdunk 를 합쳐 만들어요. 가격은 시점별 시세입니다.
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  selected,
  onClick,
}: {
  candidate: ScanCandidate;
  selected: boolean;
  onClick: () => void;
}) {
  const koName = candidate.localName ?? candidate.name;
  const jaName =
    candidate.nameJa && candidate.nameJa !== koName ? candidate.nameJa : null;

  const setCode = (candidate.setCode ?? '').toUpperCase();
  const [numLeft, numRight] = (candidate.number ?? '').split('/');
  const codeLine = [setCode, [numLeft, numRight].filter(Boolean).join('/'), candidate.rarity]
    .filter(Boolean)
    .join(' ');

  // 팩명: 한글 POKEMON_SET_MAP 우선, 없으면 TCGdex 영문 setName — 앱과 동일 규칙.
  const setInfo = lookupPokemonSet(candidate.setCode);
  const packName = setInfo?.name ?? candidate.setName ?? '';

  const ps = candidate.priceSummary;
  const snkr = candidate.snkrdunk;
  const priceLines: Array<{ label: string; text: string; emph?: boolean }> = [];
  if (ps?.byRegion) {
    if (typeof ps.byRegion.jpy === 'number')
      priceLines.push({ label: '🇯🇵 JP', text: `¥${ps.byRegion.jpy.toLocaleString()}`, emph: true });
    if (typeof ps.byRegion.krw === 'number')
      priceLines.push({ label: '🇰🇷 KR', text: `₩${ps.byRegion.krw.toLocaleString()}` });
    if (typeof ps.byRegion.eur === 'number')
      priceLines.push({ label: '🇪🇺 EU', text: `€${ps.byRegion.eur.toFixed(2)}` });
    if (typeof ps.byRegion.usd === 'number')
      priceLines.push({ label: '🇺🇸 NA', text: `$${ps.byRegion.usd.toFixed(2)}` });
  } else if (candidate.price?.marketPrice) {
    priceLines.push({
      label: candidate.price.currency === 'JPY' ? '🇯🇵 JP' : '🇰🇷 KR',
      text:
        candidate.price.currency === 'JPY'
          ? `¥${candidate.price.marketPrice.toLocaleString()}`
          : `₩${candidate.price.marketPrice.toLocaleString()}`,
      emph: true,
    });
  }

  const thumb =
    snkr?.imageUrl ?? candidate.imageLarge ?? candidate.imageSmall ?? candidate.imageUrl ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 12,
        background: selected ? 'var(--yel)' : 'var(--white)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: selected
          ? '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)'
          : '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 72,
            aspectRatio: '63 / 88',
            background: 'var(--pap3, #ddd)',
            border: '2px solid var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {thumb ? (
            // 외부 도메인(TCGdex/Snkrdunk) 이라 next/image 대신 일반 img 사용.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={koName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              loading="lazy"
            />
          ) : (
            <span style={{ fontSize: 26 }}>🃏</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {snkr && (
            <div
              style={{
                display: 'inline-block',
                background: 'var(--ink)',
                color: 'var(--yel)',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                letterSpacing: 0.3,
                padding: '2px 5px',
                marginBottom: 5,
                border: '1px solid var(--yel)',
              }}
            >
              🇯🇵 스니덩크 매칭{snkr.cacheHit ? ' · 캐시' : ''}
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--f2)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.3,
              wordBreak: 'break-all',
            }}
          >
            {koName}
            {jaName && (
              <span
                style={{
                  fontFamily: 'var(--f2)',
                  fontSize: 11,
                  fontWeight: 400,
                  color: 'var(--ink3)',
                  marginLeft: 4,
                }}
              >
                ({jaName})
              </span>
            )}
          </div>

          {codeLine && (
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 10,
                color: 'var(--ink2)',
                letterSpacing: 0.3,
                marginTop: 4,
              }}
            >
              {codeLine}
            </div>
          )}
          {packName && (
            <div
              style={{
                fontFamily: 'var(--f2)',
                fontSize: 10,
                color: 'var(--ink3)',
                marginTop: 2,
              }}
            >
              {packName}
            </div>
          )}

          {priceLines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 6 }}>
              {priceLines.map((p) => (
                <div key={p.label} style={{ display: 'flex', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 9,
                      color: p.emph ? 'var(--ink)' : 'var(--ink3)',
                      minWidth: 36,
                      letterSpacing: 0.3,
                    }}
                  >
                    {p.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: p.emph ? 11 : 9,
                      fontWeight: p.emph ? 700 : 400,
                      color: p.emph ? '#0E7C3A' : 'var(--ink3)',
                      letterSpacing: 0.3,
                    }}
                  >
                    {p.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
              }}
            >
              시세 정보 없음
            </div>
          )}
        </div>

        {selected && (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
            ✓
          </span>
        )}
      </div>
    </button>
  );
}

function KvRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <div style={{ minWidth: 80, fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', letterSpacing: 0.3 }}>
        {k}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: 'var(--f1)',
          fontSize: highlight ? 14 : 12,
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
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: 0.5, marginBottom: 4 }}>
        {label} {hi && '⚠'}
      </div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 19,
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

/**
 * 외곽/내곽 사각형으로부터 센터링 추정.
 * 평면 촬영 가정 — 픽셀 단위로 좌/우, 상/하 여백 평균 비교.
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
    fontSize: 12,
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
    fontSize: 10,
    letterSpacing: 0.5,
    color: 'var(--white)',
    background: bg,
    border: 'none',
    cursor: 'pointer',
  };
}

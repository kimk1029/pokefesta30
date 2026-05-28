'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * 카드 스포트라이트 — 컬렉션에서 🔍 버튼을 누르면 그 카드 썸네일이 풀스크린으로
 * 날아와서 회전(rotateY 360°)하며 펼쳐지는 모달.
 *
 * 애니메이션은 FLIP 기법:
 *   1) 모달이 마운트되면 카드는 일단 풀스크린 위치(최종)에 배치된다.
 *   2) useLayoutEffect 가 paint 직전에 카드를 origin rect (썸네일이 있던 자리)로
 *      transform 시켜 reset 해두고,
 *   3) 다음 frame 에 transition 을 켠 뒤 transform 을 identity 로 풀어준다.
 *   → 사용자는 "썸네일에서 시작 → 풀스크린으로 확대"되는 흐름을 본다.
 *
 * 풀스크린 본문은 카드가 70% 정도 펼쳐졌을 때(=delay 350ms) fade-in 시켜
 * 카드와 같이 들이닥치지 않게 한다.
 */

export interface CardSpotlightData {
  /** 카드 이미지 url. null 이면 이모지 fallback. */
  imageUrl: string | null;
  /** 이미지 없을 때 표시할 이모지. */
  emojiFallback?: string;
  /** 카드 풀네임 (예: "리자몽 ex"). */
  name: string;
  /** 보조 라벨 — 세트코드/번호/등급 등. */
  subtitle?: string;
  /** 그레이딩 라벨 (예: "PSA 9 (Mint)"). 없으면 미표시. */
  gradeLabel?: string | null;
  /** 통화 기호 + 숫자가 이미 포함된 표시용 문자열 (예: "¥38,000" / "$27.50"). */
  priceLabel: string | null;
  /** 가격 추이 배열 (오래된 → 최신). 2개 미만이면 차트/등락 숨김. */
  trend: number[];
  /** 차트 라벨에 쓰는 통화 기호 (¥/₩/$). priceLabel 첫 글자에서 추출하기 귀찮을 때 명시. */
  currencySymbol?: string;
}

interface Props {
  data: CardSpotlightData | null;
  /** 시작 위치 — 클릭된 썸네일의 화면상 사각형. null 이면 페이드 인. */
  origin: DOMRect | null;
  onClose: () => void;
}

const OPEN_MS = 650;
const BODY_DELAY_MS = 350;

export function CardSpotlightModal({ data, origin, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeOrigin, setCloseOrigin] = useState<DOMRect | null>(origin);

  // origin 이 마운트 후 바뀌면 닫힐 때 돌아갈 위치도 갱신.
  useEffect(() => {
    setCloseOrigin(origin);
  }, [origin]);

  // 모달이 열려있는 동안 페이지 스크롤 잠금.
  useEffect(() => {
    if (!data) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [data]);

  // ESC 키로 닫기.
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // FLIP 오프닝 애니메이션.
  useLayoutEffect(() => {
    if (!data || !cardRef.current) return;
    const el = cardRef.current;
    const final = el.getBoundingClientRect();
    if (!closeOrigin) {
      // origin 없으면 가벼운 페이드+스케일.
      el.style.transition = 'none';
      el.style.transformOrigin = 'center center';
      el.style.transform = 'scale(0.85) rotateY(180deg)';
      el.style.opacity = '0';
      // 강제 reflow.
      void el.getBoundingClientRect();
      el.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.22,.85,.25,1.02), opacity 300ms ease-out`;
      el.style.transform = 'scale(1) rotateY(360deg)';
      el.style.opacity = '1';
      return;
    }
    const dx = closeOrigin.left - final.left;
    const dy = closeOrigin.top - final.top;
    const sx = Math.max(0.001, closeOrigin.width / final.width);
    const sy = Math.max(0.001, closeOrigin.height / final.height);
    el.style.transition = 'none';
    el.style.transformOrigin = 'top left';
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy}) rotateY(0deg)`;
    el.style.opacity = '1';
    // 다음 paint 까지 강제로 한 번 측정 — transition 이 처음부터 잡히도록.
    void el.getBoundingClientRect();
    el.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.22,.85,.25,1.02)`;
    el.style.transform = 'translate3d(0,0,0) scale(1, 1) rotateY(360deg)';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const startClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const el = cardRef.current;
    if (!el) {
      onClose();
      return;
    }
    // 닫기는 거꾸로 — final → origin.
    if (closeOrigin) {
      const final = el.getBoundingClientRect();
      const dx = closeOrigin.left - final.left;
      const dy = closeOrigin.top - final.top;
      const sx = Math.max(0.001, closeOrigin.width / final.width);
      const sy = Math.max(0.001, closeOrigin.height / final.height);
      el.style.transition = `transform 360ms cubic-bezier(.4,0,.7,.3), opacity 280ms ease-in`;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy}) rotateY(0deg)`;
      el.style.opacity = '0';
    } else {
      el.style.transition = 'transform 280ms ease-in, opacity 280ms ease-in';
      el.style.transform = 'scale(0.85) rotateY(180deg)';
      el.style.opacity = '0';
    }
    window.setTimeout(onClose, 380);
  }, [closing, closeOrigin, onClose]);

  const change = useMemo(() => (data ? changeFromTrend(data.trend) : null), [data]);

  if (!data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${data.name} 상세`}
      onClick={startClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '60px 16px 24px',
        overflow: 'auto',
        animation: 'cv-spot-bg-in 200ms ease-out both',
      }}
    >
      {/* 닫기 버튼 — 우상단 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          startClose();
        }}
        aria-label="닫기"
        style={{
          position: 'fixed',
          top: 14,
          right: 14,
          width: 40,
          height: 40,
          background: 'var(--ink)',
          color: 'var(--gold)',
          border: 0,
          fontFamily: 'var(--f1)',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 0.5,
          cursor: 'pointer',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--gold)',
          zIndex: 2,
        }}
      >
        ✕
      </button>

      {/* 카드 본체 — FLIP 애니메이션 대상 */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(78vw, 360px)',
          aspectRatio: '63 / 88',
          background: '#000',
          overflow: 'hidden',
          willChange: 'transform, opacity',
          transformStyle: 'preserve-3d',
          boxShadow:
            '0 0 0 4px var(--ink), 0 0 0 6px var(--gold), 0 24px 60px rgba(0,0,0,0.55), 0 0 80px rgba(255,210,63,0.35)',
        }}
      >
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imageUrl}
            alt={data.name}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(160deg, #1E293B, #0F172A)',
              fontSize: 110,
            }}
          >
            {data.emojiFallback ?? '🃏'}
          </div>
        )}
      </div>

      {/* 카드 아래쪽 정보 — 카드가 펼쳐진 다음에 page-fade 로 등장 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          marginTop: 22,
          opacity: 0,
          animation: `cv-spot-body-in 420ms cubic-bezier(.2,.9,.3,1) ${BODY_DELAY_MS}ms both`,
          transform: 'translateY(20px)',
        }}
      >
        <div
          style={{
            padding: 14,
            background: 'var(--white)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--gold)',
          }}
        >
          {/* 카드명 */}
          <div
            style={{
              fontFamily: 'var(--f2)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.3,
              wordBreak: 'keep-all',
            }}
          >
            {data.name}
          </div>
          {(data.subtitle || data.gradeLabel) && (
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--f1)',
                fontSize: 10,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
              }}
            >
              {[data.subtitle, data.gradeLabel].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* 가격 + 등락률 — 큰 박스 */}
          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              background: 'var(--ink)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink2)',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  letterSpacing: 0.5,
                  color: 'rgba(255,210,63,0.7)',
                }}
              >
                현재 시세
              </div>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  marginTop: 2,
                }}
              >
                {data.priceLabel ?? '시세 없음'}
              </div>
            </div>
            {change ? (
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
                    letterSpacing: 0.5,
                    color: 'rgba(255,210,63,0.7)',
                  }}
                >
                  전일 대비
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: CHANGE_TONE[change.dir],
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {CHANGE_ARROW[change.dir]} {Math.abs(change.pct).toFixed(1)}%
                </div>
              </div>
            ) : null}
          </div>

          {/* 큰 추이 차트 */}
          {data.trend.length >= 2 ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--pap2)',
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: 'var(--ink3)',
                  letterSpacing: 0.3,
                }}
              >
                <span>📈 최근 추이 (총 {data.trend.length}점)</span>
                <span>
                  {data.currencySymbol ?? ''}
                  {fmtNum(Math.min(...data.trend))} ~ {data.currencySymbol ?? ''}
                  {fmtNum(Math.max(...data.trend))}
                </span>
              </div>
              <BigSparkline points={data.trend} />
            </div>
          ) : (
            <div
              style={{
                marginTop: 12,
                padding: '14px 12px',
                background: 'var(--pap2)',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
                textAlign: 'center',
              }}
            >
              📊 추이 데이터가 아직 부족해요
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 0.5,
          }}
        >
          탭/ESC 로 닫기
        </div>
      </div>

      {/* 키프레임 — 모달이 마운트될 때만 inline 정의 */}
      <style>{`
        @keyframes cv-spot-bg-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cv-spot-body-in {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ----------------------- helpers ------------------------- */

const CHANGE_ARROW: Record<'up' | 'down' | 'flat', string> = { up: '▲', down: '▼', flat: '–' };
const CHANGE_TONE: Record<'up' | 'down' | 'flat', string> = {
  up: '#FF6B7E',
  down: '#7EB6FF',
  flat: 'rgba(255,255,255,0.65)',
};

function changeFromTrend(trend: number[]): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const prev = trend[trend.length - 2];
  const last = trend[trend.length - 1];
  if (!(prev > 0)) return null;
  const pct = ((last - prev) / prev) * 100;
  const dir: 'up' | 'down' | 'flat' = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
}

function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString('ko-KR');
}

/**
 * 풀스크린 모달용 큰 라인 차트 — 시작점 → 끝점 색상 (up=빨강, down=파랑).
 * area fill + 마지막 점 강조 + max/min 점 라벨.
 */
function BigSparkline({ points }: { points: number[] }) {
  const W = 320;
  const H = 110;
  const PAD = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const usableW = W - PAD * 2;
  const usableH = H - PAD * 2;
  const stepX = usableW / (points.length - 1);
  const xOf = (i: number) => PAD + i * stepX;
  const yOf = (v: number) => PAD + (usableH - ((v - min) / range) * usableH);
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const area =
    `${line} L${xOf(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} ` +
    `L${xOf(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const up = points[points.length - 1] >= points[0];
  const stroke = up ? '#E63946' : '#3A5BD9';
  const fill = up ? 'rgba(230,57,70,0.18)' : 'rgba(58,91,217,0.18)';

  const lastIdx = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* 가로 grid 4줄 */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={PAD}
          x2={W - PAD}
          y1={PAD + usableH * t}
          y2={PAD + usableH * t}
          stroke="rgba(0,0,0,0.08)"
          strokeDasharray="3 3"
        />
      ))}
      <path d={area} fill={fill} />
      <path d={line} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* 마지막 점 강조 — pulsing dot */}
      <circle cx={xOf(lastIdx)} cy={yOf(points[lastIdx])} r={4.5} fill={stroke} />
      <circle cx={xOf(lastIdx)} cy={yOf(points[lastIdx])} r={4.5} fill="none" stroke={stroke} strokeOpacity={0.5}>
        <animate attributeName="r" from="4.5" to="11" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

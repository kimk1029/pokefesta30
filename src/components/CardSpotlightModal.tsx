'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * 카드 스포트라이트 — 컬렉션에서 🔍 버튼을 누르면 그 카드 썸네일이 풀스크린으로
 * 날아와서 회전(rotateY 720°)하며 펼쳐지는 모달.
 *
 * UI 전략(v2): 카드 이미지 자체가 컨테이너. 이미지 위에 위/아래 그라데이션
 * 딤을 깔고 그 위에 카드명·시세·등락률·그래프를 오버레이로 그린다. 카드 한
 * 장으로 모든 정보가 멋있게 모이는 "하이라이트 샷".
 *
 * 닫기: 백드롭 / ✕ / ESC. 누르면 _즉시_ 백그라운드를 페이드아웃 시작하고
 * 240ms 후 unmount. v1 에서 ✕ 가 안 닫혔던 건 closing state 와 onClose 가
 * 동기/비동기 충돌해서 transition 콜백이 안 잡힌 케이스. v2 는 setTimeout
 * 으로 강제 종료 보장.
 */

export interface CardSpotlightData {
  imageUrl: string | null;
  emojiFallback?: string;
  name: string;
  subtitle?: string | null;
  gradeLabel?: string | null;
  /** 통화 기호 + 숫자가 포함된 표시용 문자열 (예: "¥38,000" / "$27.50"). */
  priceLabel: string | null;
  /** 가격 추이 배열 (오래된 → 최신). 2개 미만이면 차트/등락 숨김. */
  trend: number[];
  /** 차트 라벨에 쓰는 통화 기호 (¥/₩/$). */
  currencySymbol?: string;
}

interface Props {
  data: CardSpotlightData | null;
  /** 시작 위치 — 클릭된 썸네일의 화면상 사각형. null 이면 페이드 인. */
  origin: DOMRect | null;
  onClose: () => void;
}

const OPEN_MS = 850;
const CLOSE_MS = 280;

const DEFAULT_NEON = '#22F58C';

export function CardSpotlightModal({ data, origin, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  // 카드 이미지의 dominant hue 를 네온 톤으로 변환한 색. 서버에서 한 번 분석 후
  // URL 별 LRU 캐시. 기본은 그린 — fetch 도착 전 / 실패 시 폴백.
  const [neonColor, setNeonColor] = useState<string>(DEFAULT_NEON);

  // origin 은 닫을 때도 필요. ref 로 안정화 — props 가 변해도 같은 값 유지.
  const originRef = useRef<DOMRect | null>(origin);
  useEffect(() => {
    if (data) originRef.current = origin;
  }, [data, origin]);

  // 모달이 열려있는 동안 페이지 스크롤 잠금.
  useEffect(() => {
    if (!data) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [data]);

  // 카드 이미지의 dominant 네온 색 fetch — 이미지 URL 이 바뀔 때마다.
  useEffect(() => {
    if (!data?.imageUrl) {
      setNeonColor(DEFAULT_NEON);
      return;
    }
    let cancelled = false;
    setNeonColor(DEFAULT_NEON); // 새 카드 떴을 때 일단 기본색
    fetch(`/api/cards/dominant-color?url=${encodeURIComponent(data.imageUrl)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: { ok?: boolean; hex?: string }) => {
        if (cancelled) return;
        if (j?.ok && typeof j.hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(j.hex)) {
          setNeonColor(j.hex);
        }
      })
      .catch(() => {/* keep default */});
    return () => {
      cancelled = true;
    };
  }, [data?.imageUrl]);

  /* 카드 펼침 FLIP — origin rect 가 있으면 거기서 시작, 없으면 가벼운 페이드. */
  useLayoutEffect(() => {
    if (!data || !cardRef.current) return;
    const el = cardRef.current;
    const orig = originRef.current;
    const final = el.getBoundingClientRect();

    if (orig) {
      const dx = orig.left + orig.width / 2 - (final.left + final.width / 2);
      const dy = orig.top + orig.height / 2 - (final.top + final.height / 2);
      const s = Math.max(0.04, orig.width / final.width);
      el.style.transition = 'none';
      el.style.transformOrigin = 'center center';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s}) rotateY(0deg)`;
      el.style.opacity = '0.4';
      // reflow
      void el.getBoundingClientRect();
      el.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.16,1.18,.32,1), opacity ${OPEN_MS * 0.5}ms ease-out`;
      el.style.transform = 'translate3d(0,0,0) scale(1) rotateY(720deg)';
      el.style.opacity = '1';
    } else {
      el.style.transition = 'none';
      el.style.transform = 'scale(0.7) rotateY(0deg)';
      el.style.opacity = '0';
      void el.getBoundingClientRect();
      el.style.transition = `transform ${OPEN_MS}ms cubic-bezier(.16,1.18,.32,1), opacity ${OPEN_MS * 0.5}ms ease-out`;
      el.style.transform = 'scale(1) rotateY(720deg)';
      el.style.opacity = '1';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const startClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);

    // 카드 fly-back — origin 으로 작아지면서 회전 역방향.
    const el = cardRef.current;
    const orig = originRef.current;
    if (el && orig) {
      const final = el.getBoundingClientRect();
      const dx = orig.left + orig.width / 2 - (final.left + final.width / 2);
      const dy = orig.top + orig.height / 2 - (final.top + final.height / 2);
      const s = Math.max(0.04, orig.width / final.width);
      el.style.transition = `transform ${CLOSE_MS}ms cubic-bezier(.6,0,.7,.2), opacity ${CLOSE_MS}ms ease-in`;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s}) rotateY(0deg)`;
      el.style.opacity = '0';
    } else if (el) {
      el.style.transition = `transform ${CLOSE_MS}ms ease-in, opacity ${CLOSE_MS}ms ease-in`;
      el.style.transform = 'scale(0.7) rotateY(0deg)';
      el.style.opacity = '0';
    }

    if (overlayRef.current) {
      overlayRef.current.style.transition = `opacity ${CLOSE_MS}ms ease-in`;
      overlayRef.current.style.opacity = '0';
    }

    // 안전망 — transition 안 잡히는 경우에도 timeout 으로 무조건 unmount.
    window.setTimeout(() => {
      closingRef.current = false;
      setClosing(false);
      onClose();
    }, CLOSE_MS + 30);
  }, [onClose]);

  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, startClose]);

  const change = useMemo(() => (data ? changeFromTrend(data.trend) : null), [data]);

  if (!data) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${data.name} 카드 하이라이트`}
      onClick={startClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflow: 'hidden',
        animation: closing ? undefined : 'cv-spot-bg-in 240ms ease-out both',
        opacity: 1,
        transition: 'opacity 240ms ease-out',
      }}
    >
      {/* 카드 본체 — FLIP 애니메이션 대상. 이미지가 컨테이너이고 위에 오버레이가
          쌓인다. preserve-3d 라 perspective 적용 시 입체감이 살아난다.
          그린 네온 보더 + 펄싱 글로우 (cv-spot-pulse keyframe). */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="cv-spot-card-neon"
        style={{
          position: 'relative',
          width: 'min(86vw, 380px)',
          aspectRatio: '63 / 88',
          maxHeight: '88vh',
          background: '#000',
          overflow: 'hidden',
          borderRadius: 18,
          willChange: 'transform, opacity, box-shadow',
          transformStyle: 'preserve-3d',
          // 동적 네온 색 — keyframe 의 box-shadow 가 var(--cv-neon) 참조.
          // hex → rgb 분해해 알파 글로우에도 같은 색조가 적용되도록 var 두 개 제공.
          ...({ '--cv-neon': neonColor, '--cv-neon-rgb': hexToRgb(neonColor) } as React.CSSProperties),
        }}
      >
        {/* 카드 이미지 — 풀 cover */}
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imageUrl}
            alt={data.name}
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              userSelect: 'none',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(160deg, #1E293B, #0F172A)',
              fontSize: 140,
            }}
          >
            {data.emojiFallback ?? '🃏'}
          </div>
        )}

        {/* 상단 그라데이션 + 정보 (카드명 / subtitle / 등급) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '18px 16px 36px',
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0) 100%)',
            color: 'var(--white)',
            animation: closing ? undefined : 'cv-spot-top-in 520ms cubic-bezier(.2,.9,.3,1) 250ms both',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              letterSpacing: 0.5,
              color: 'var(--gold)',
              marginBottom: 4,
            }}
          >
            ★ CARD HIGHLIGHT
          </div>
          <div
            style={{
              fontFamily: 'var(--f2)',
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.25,
              wordBreak: 'keep-all',
              textShadow: '0 2px 10px rgba(0,0,0,0.85)',
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
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: 0.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              }}
            >
              {[data.subtitle, data.gradeLabel].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* X 닫기 — 카드 우상단. border 없이 어두운 반투명 원 + 텍스트 글로우로 가독성. */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startClose();
          }}
          aria-label="닫기"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            background: 'rgba(0,0,0,0.55)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '50%',
            fontFamily: 'var(--f1)',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            zIndex: 4,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 2px rgba(0,0,0,0.9)',
          }}
        >
          ✕
        </button>

        {/* 하단 그라데이션 + 차트 + 가격 + 등락 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '36px 16px 16px',
            background:
              'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0) 100%)',
            color: 'var(--white)',
            animation: closing ? undefined : 'cv-spot-bot-in 520ms cubic-bezier(.2,.9,.3,1) 380ms both',
          }}
        >
          {/* 차트 — 카드 폭에 area 가득. 데이터 없으면 자리 차지 안 함 */}
          {data.trend.length >= 2 ? (
            <CardOverlayChart points={data.trend} />
          ) : null}

          {/* 가격 + 등락률 */}
          <div
            style={{
              marginTop: data.trend.length >= 2 ? 12 : 0,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'nowrap',
            }}
          >
            <div style={{ minWidth: 0, flexShrink: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: 'rgba(255,210,63,0.85)',
                  letterSpacing: 0.5,
                  marginBottom: 3,
                  whiteSpace: 'nowrap',
                }}
              >
                CURRENT
              </div>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--gold)',
                  letterSpacing: 0.3,
                  textShadow: '0 2px 6px rgba(0,0,0,0.7), 0 0 12px rgba(255,210,63,0.4)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {data.priceLabel ?? '시세 없음'}
              </div>
            </div>
            {change && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.5,
                    marginBottom: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  전일 대비
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: CHANGE_TONE[change.dir],
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                    lineHeight: 1,
                  }}
                >
                  {CHANGE_ARROW[change.dir]} {Math.abs(change.pct).toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {/* 힌트 */}
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 0.5,
              textAlign: 'center',
            }}
          >
            탭/ESC 닫기
          </div>
        </div>
      </div>

      {/* 키프레임 — 모달 마운트 시점에만 inline 정의.
          cv-spot-pulse: 그린 네온 보더(box-shadow) 가 은은하게 강도 바뀜 */}
      <style>{`
        @keyframes cv-spot-bg-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cv-spot-top-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cv-spot-bot-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cv-spot-neon-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 1.5px var(--cv-neon, #22F58C),
              0 0 12px rgba(var(--cv-neon-rgb, 34,245,140), 0.55),
              0 0 32px rgba(var(--cv-neon-rgb, 34,245,140), 0.35),
              0 30px 80px rgba(0,0,0,0.7);
          }
          50% {
            box-shadow:
              0 0 0 2px var(--cv-neon, #22F58C),
              0 0 22px rgba(var(--cv-neon-rgb, 34,245,140), 0.85),
              0 0 56px rgba(var(--cv-neon-rgb, 34,245,140), 0.55),
              0 30px 80px rgba(0,0,0,0.7);
          }
        }
        .cv-spot-card-neon {
          box-shadow:
            0 0 0 1.5px var(--cv-neon, #22F58C),
            0 0 12px rgba(var(--cv-neon-rgb, 34,245,140), 0.55),
            0 0 32px rgba(var(--cv-neon-rgb, 34,245,140), 0.35),
            0 30px 80px rgba(0,0,0,0.7);
          animation: cv-spot-neon-pulse 2.6s ease-in-out infinite;
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
  flat: 'rgba(255,255,255,0.7)',
};

/** "#RRGGBB" → "r, g, b" (rgba(...) 안에 그대로 박을 수 있는 형태). */
function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '34,245,140';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

function changeFromTrend(trend: number[]): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const prev = trend[trend.length - 2];
  const last = trend[trend.length - 1];
  if (!(prev > 0)) return null;
  const pct = ((last - prev) / prev) * 100;
  const dir: 'up' | 'down' | 'flat' = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
}

/**
 * 카드 위에 얹는 area 차트 — 상승=빨강계열, 하락=파랑계열. stroke 는 항상 골드.
 * 카드 폭에 채워 area + 라인만 (라벨/그리드 X — 카드 위 오버레이에 노이즈 줄이려고).
 */
function CardOverlayChart({ points }: { points: number[] }) {
  const W = 320;
  const H = 70;
  const PAD = 4;
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
  const areaFill = up
    ? 'url(#cv-spot-grad-up)'
    : 'url(#cv-spot-grad-down)';
  const lastIdx = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cv-spot-grad-up" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,210,63,0.7)" />
          <stop offset="100%" stopColor="rgba(255,210,63,0)" />
        </linearGradient>
        <linearGradient id="cv-spot-grad-down" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(126,182,255,0.7)" />
          <stop offset="100%" stopColor="rgba(126,182,255,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill={areaFill} />
      <path
        d={line}
        stroke="#FFD23F"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
      />
      {/* 마지막 점 강조 + 펄싱 */}
      <circle cx={xOf(lastIdx)} cy={yOf(points[lastIdx])} r={3.5} fill="#FFD23F" />
      <circle cx={xOf(lastIdx)} cy={yOf(points[lastIdx])} r={3.5} fill="none" stroke="#FFD23F" strokeOpacity={0.6}>
        <animate attributeName="r" from="3.5" to="11" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

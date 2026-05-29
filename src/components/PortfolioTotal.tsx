'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/components/PriceModeProvider';
import { useSession, signIn } from '@/lib/session';

/**
 * 포트폴리오 총합 (JPY) — 마이페이지 헤더에서 보여줌.
 * `/api/me/portfolio` 는 스니덩크 실시간 시세 조회 + 오늘자 KST 스냅샷 upsert.
 * 응답에 어제 대비 등락 (절대값/%) 과 30일 히스토리가 함께 옴.
 * 관심카드는 합계에 포함되지 않음 — 서버에서 컬렉션(UserCard) 만 합산.
 */
export function PortfolioTotal() {
  const { format } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const session = useSession();
  // 미로그인 시 fetch 건너뛰고 오버레이만 표시. 로그인 시도 후 인증되면 다시 fetch.
  const unauth = session.status === 'unauthenticated';
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'empty' }
    | {
        kind: 'ok';
        totalJpy: number;
        totalPsa10Jpy: number;
        pricedCount: number;
        pricedPsa10Count: number;
        totalCount: number;
        changeAbsJpy: number | null;
        changePct: number | null;
        history: Array<{ date: string; totalJpy: number }>;
      }
    | { kind: 'error' }
  >({ kind: 'loading' });

  useEffect(() => {
    if (session.status !== 'authenticated') return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/portfolio', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!alive) return;
        if (!r.ok) {
          setState({ kind: 'error' });
          return;
        }
        const j = (await r.json()) as {
          data?: {
            totalJpy: number;
            totalPsa10Jpy?: number;
            pricedCount: number;
            pricedPsa10Count?: number;
            totalCount: number;
            changeAbsJpy: number | null;
            changePct: number | null;
            history: Array<{ date: string; totalJpy: number }>;
          };
        };
        const d = j.data;
        if (!d || d.totalCount === 0) {
          setState({ kind: 'empty' });
          return;
        }
        setState({
          kind: 'ok',
          totalJpy: d.totalJpy,
          totalPsa10Jpy: d.totalPsa10Jpy ?? 0,
          pricedCount: d.pricedCount,
          pricedPsa10Count: d.pricedPsa10Count ?? 0,
          totalCount: d.totalCount,
          changeAbsJpy: d.changeAbsJpy,
          changePct: d.changePct,
          history: d.history ?? [],
        });
      } catch {
        if (alive) setState({ kind: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [session.status]);

  return (
    <div
      style={{
        position: 'relative',
        marginTop: 10,
        padding: '8px 10px',
        background: 'rgba(0,0,0,.35)',
        boxShadow: 'inset 0 2px 0 rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.08)',
        overflow: 'hidden',
      }}
    >
      {unauth && <PortfolioLoginGate />}
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'rgba(255,255,255,.5)',
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        포트폴리오 평가액 (스니덩크 최저가 합계)
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 17,
            color: 'var(--gold)',
            letterSpacing: 0.3,
          }}
        >
          {state.kind === 'loading'
            ? '계산 중…'
            : state.kind === 'ok'
              ? format(
                  priceMode === 'psa10' && state.totalPsa10Jpy > 0
                    ? state.totalPsa10Jpy
                    : state.totalJpy,
                )
              : state.kind === 'empty'
                ? '컬렉션 없음'
                : '시세 조회 실패'}
        </span>
        {state.kind === 'ok' && state.changePct != null && (
          <DeltaBadge pct={state.changePct} absJpy={state.changeAbsJpy} format={format} />
        )}
        {state.kind === 'ok' && (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.45)' }}>
            {state.pricedCount}/{state.totalCount}장 시세 반영
          </span>
        )}
      </div>
      {state.kind === 'ok' && state.history.length >= 2 && (
        <DeltaSparkline points={state.history.map((h) => h.totalJpy)} />
      )}
    </div>
  );
}

function DeltaBadge({
  pct,
  absJpy,
  format,
}: {
  pct: number;
  absJpy: number | null;
  format: (jpy: number) => string;
}) {
  const up = pct >= 0;
  const sign = up ? '▲' : '▼';
  const color = up ? '#22C55E' : '#E63946';
  const pctStr = `${up ? '+' : ''}${pct.toFixed(1)}%`;
  const absStr = absJpy != null ? ` ${up ? '+' : ''}${format(Math.abs(absJpy))}` : '';
  return (
    <span
      style={{
        fontFamily: 'var(--f1)',
        fontSize: 10,
        color,
        letterSpacing: 0.3,
        padding: '2px 6px',
        background: 'rgba(0,0,0,.2)',
        boxShadow: `inset 0 0 0 1px ${color}55`,
      }}
      title="어제 정각 (KST) 대비"
    >
      {sign} {pctStr}{absStr ? ` (${up ? '+' : '-'}${format(Math.abs(absJpy!))})` : ''}
    </span>
  );
}

/** 작은 라인 스파크라인 — history 의 JPY 시계열 0..1 정규화 후 SVG path. */
function DeltaSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 280;
  const H = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const step = W / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = H - 2 - ((v - min) / span) * (H - 4);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;
  return (
    <div style={{ marginTop: 6 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: '100%' }}>
        <path d={d} fill="none" stroke={up ? '#22C55E' : '#E63946'} strokeWidth={2} strokeLinejoin="round" />
        {/* baseline */}
        <line
          x1={0}
          y1={H - 2}
          x2={W}
          y2={H - 2}
          stroke="rgba(255,255,255,.08)"
          strokeWidth={1}
        />
      </svg>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'rgba(255,255,255,.35)',
          letterSpacing: 0.3,
          marginTop: 3,
        }}
      >
        최근 {points.length}일 (KST 정각 기준)
      </div>
    </div>
  );
}

/* ------------------ 미로그인 오버레이 ------------------ */

/**
 * 포트폴리오 영역 위에 dim + blur 오버레이를 덮어 "로그인 후 확인" 안내.
 * 모바일 InlineLoginGate 와 같은 톤(자물쇠 + 한 줄 안내 + 소셜 CTA).
 * 부모가 position:relative + overflow:hidden 이라 absolute inset:0 으로 덮음.
 */
function PortfolioLoginGate() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '14px 12px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1 }}>🔒</div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 12,
          color: 'var(--gold)',
          letterSpacing: 0.5,
          lineHeight: 1.4,
        }}
      >
        로그인 후 확인할 수 있어요
      </div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: 0.3,
          lineHeight: 1.55,
        }}
      >
        내 카드 컬렉션을 스니덩크 실시간 시세로 합산해 보여드려요
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <GateBtn label="카카오" bg="#FEE500" color="#191919" onClick={() => signIn('kakao', '/my')} />
        <GateBtn label="네이버" bg="#03C75A" color="#fff" onClick={() => signIn('naver', '/my')} />
        <GateBtn label="구글" bg="#fff" color="#1f1f1f" onClick={() => signIn('google', '/my')} />
      </div>
    </div>
  );
}

function GateBtn({
  label,
  bg,
  color,
  onClick,
}: {
  label: string;
  bg: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: bg,
        color,
        border: 'none',
        fontFamily: 'var(--f1)',
        fontSize: 10,
        letterSpacing: 0.5,
        cursor: 'pointer',
        boxShadow:
          '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--ink)',
      }}
    >
      {label}
    </button>
  );
}

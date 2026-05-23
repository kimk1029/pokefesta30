'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';

/**
 * 포트폴리오 총합 (JPY) — 마이페이지 헤더에서 보여줌.
 * `/api/me/portfolio` 는 스니덩크 실시간 시세 조회 (Promise.all) 라 시간이 좀
 * 걸리니까 페이지 첫 페인트에 묶지 않고 클라이언트에서 따로 가져온다.
 * 관심카드는 합계에 포함되지 않음 — 서버에서 컬렉션(UserCard) 만 합산.
 */
export function PortfolioTotal() {
  const { format } = useCurrency();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'empty' }
    | { kind: 'ok'; totalJpy: number; pricedCount: number; totalCount: number }
    | { kind: 'error' }
  >({ kind: 'loading' });

  useEffect(() => {
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
          data?: { totalJpy: number; pricedCount: number; totalCount: number };
        };
        const d = j.data;
        if (!d || d.totalCount === 0) {
          setState({ kind: 'empty' });
          return;
        }
        setState({
          kind: 'ok',
          totalJpy: d.totalJpy,
          pricedCount: d.pricedCount,
          totalCount: d.totalCount,
        });
      } catch {
        if (alive) setState({ kind: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      style={{
        marginTop: 10,
        padding: '8px 10px',
        background: 'rgba(0,0,0,.35)',
        boxShadow: 'inset 0 2px 0 rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.08)',
      }}
    >
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
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
              ? format(state.totalJpy)
              : state.kind === 'empty'
                ? '컬렉션 없음'
                : '시세 조회 실패'}
        </span>
        {state.kind === 'ok' && (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.45)' }}>
            {state.pricedCount}/{state.totalCount}장 시세 반영
          </span>
        )}
      </div>
    </div>
  );
}

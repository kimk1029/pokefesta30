'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/components/PriceModeProvider';

interface HistPoint {
  date: string;
  totalJpy: number;
}

interface PortfolioData {
  totalJpy: number;
  totalPsa10Jpy: number;
  pricedCount: number;
  totalCount: number;
  changeAbsJpy: number | null;
  changePct: number | null;
  history: HistPoint[];
}

interface CardRow {
  id: number;
  cardId: string | null;
  nickname: string | null;
  photoUrl: string | null;
  snkrdunkName: string | null;
  snkrdunkImageUrl: string | null;
  priceSingleJpy: number;
  pricePsa10Jpy: number;
  trend: number[];
  buyPrice: number | null;
  buyCurrency: string | null;
  qty: number;
  buyDate: string | null;
  selfPulled: boolean;
  graded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  ocrSetCode: string | null;
  ocrCardNumber: string | null;
}

export function PortfolioScreen() {
  const { format, rate } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const [port, setPort] = useState<PortfolioData | null>(null);
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, cr] = await Promise.all([
          fetch('/api/me/portfolio', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/me/cards/with-prices', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (!alive) return;
        const pj = (await pr.json().catch(() => null)) as { data?: PortfolioData } | null;
        const cj = (await cr.json().catch(() => null)) as { data?: CardRow[] } | null;
        setPort(pj?.data ?? null);
        setCards(cj?.data ?? []);
      } catch {
        if (alive) setErr('포트폴리오를 불러오지 못했어요');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const usePsa10 = priceMode === 'psa10';

  // 카드별 현재가(JPY) + 구매기준가(JPY) + 등락률 계산.
  const rows = useMemo(() => {
    if (!cards) return [];
    return cards.map((c) => {
      const curJpy = usePsa10 && c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : c.priceSingleJpy;
      const qty = Math.max(1, c.qty || 1);
      const basisJpy =
        c.buyPrice != null && c.buyPrice > 0
          ? c.buyCurrency === 'JPY'
            ? c.buyPrice
            : c.buyPrice / (rate || 1)
          : null;
      const profitPct = basisJpy && curJpy > 0 ? ((curJpy - basisJpy) / basisJpy) * 100 : null;
      // 시세 일변동 (trend 마지막 2점)
      const t = c.trend ?? [];
      const dayPct = t.length >= 2 && t[t.length - 2] > 0 ? ((t[t.length - 1] - t[t.length - 2]) / t[t.length - 2]) * 100 : null;
      return { c, curJpy, qty, basisJpy, profitPct, dayPct };
    });
  }, [cards, usePsa10, rate]);

  // 전체 손익 (구매기준가 있는 카드만)
  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const r of rows) {
      if (r.basisJpy && r.curJpy > 0) {
        invested += r.basisJpy * r.qty;
        current += r.curJpy * r.qty;
      }
    }
    const profit = current - invested;
    const pct = invested > 0 ? (profit / invested) * 100 : null;
    return { invested, current, profit, pct };
  }, [rows]);

  if (err) return <div className="cv-port-msg">⚠ {err}</div>;
  if (!port || !cards) return <div className="cv-port-msg">불러오는 중…</div>;
  if (port.totalCount === 0)
    return (
      <div className="cv-port-msg">
        아직 보유 카드가 없어요.
        <br />
        <Link href="/cards/add" style={{ color: 'var(--blu)', textDecoration: 'underline' }}>
          카드 추가하러 가기 →
        </Link>
      </div>
    );

  const totalJpy = usePsa10 && port.totalPsa10Jpy > 0 ? port.totalPsa10Jpy : port.totalJpy;
  const up = (port.changePct ?? 0) >= 0;

  return (
    <div className="cv-port-screen">
      {/* 평가액 헤더 — 주식 호가창 톤 */}
      <div className="cv-port-head">
        <div className="cv-port-head-label">총 평가액 (스니덩크 시세 합계)</div>
        <div className="cv-port-head-val">{format(totalJpy)}</div>
        <div className="cv-port-head-row">
          {port.changePct != null && (
            <span className={`cv-port-delta ${up ? 'up' : 'down'}`}>
              {up ? '▲' : '▼'} {up ? '+' : ''}
              {port.changePct.toFixed(2)}%
              {port.changeAbsJpy != null && ` (${up ? '+' : '-'}${format(Math.abs(port.changeAbsJpy))})`}
            </span>
          )}
          <span className="cv-port-head-sub">{port.pricedCount}/{port.totalCount}장 시세 반영 · 어제(KST) 대비</span>
        </div>
        {totals.pct != null && (
          <div className="cv-port-invest">
            매입 {format(totals.invested)} → 현재 {format(totals.current)}{' '}
            <span className={totals.profit >= 0 ? 'cv-port-up' : 'cv-port-down'}>
              {totals.profit >= 0 ? '+' : '-'}
              {format(Math.abs(totals.profit))} ({totals.profit >= 0 ? '+' : ''}
              {totals.pct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* 일별 차트 — 점 클릭 시 해당 일의 금액·등락률 표시 */}
      <PortfolioChart history={port.history} format={format} selIdx={selIdx} onSelect={setSelIdx} />

      {/* 카드별 등락률 리스트 */}
      <div className="cv-port-list-title">보유 카드 등락률 ({rows.length})</div>
      <div className="cv-port-list">
        {rows.map(({ c, curJpy, profitPct, dayPct, basisJpy }) => {
          const img = c.snkrdunkImageUrl || c.photoUrl || null;
          const name = c.snkrdunkName || c.nickname || '이름 미상';
          const changePct = profitPct ?? dayPct;
          const changeUp = (changePct ?? 0) >= 0;
          return (
            <div key={c.id} className="cv-port-card">
              <div className="cv-reg-thumb" style={{ width: 40, height: 56 }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={name} />
                ) : (
                  <span style={{ fontSize: 20 }}>🃏</span>
                )}
              </div>
              <div className="cv-port-card-meta">
                <div className="cv-port-card-name">
                  {name}
                  {c.graded && (
                    <span className="cv-port-grade">
                      {c.gradeCompany ?? 'PSA'} {c.gradeValue ?? ''}
                    </span>
                  )}
                </div>
                <div className="cv-port-card-sub">
                  {[c.ocrSetCode?.toUpperCase(), c.ocrCardNumber].filter(Boolean).join(' · ')}
                  {c.qty > 1 ? ` · ×${c.qty}` : ''}
                  {c.selfPulled ? ' · 직접뽑기' : ''}
                </div>
              </div>
              <div className="cv-port-card-price">
                <div className="cv-port-card-cur">{curJpy > 0 ? format(curJpy) : '시세 없음'}</div>
                {changePct != null && (
                  <div className={`cv-port-card-delta ${changeUp ? 'up' : 'down'}`}>
                    {changeUp ? '▲' : '▼'} {changeUp ? '+' : ''}
                    {changePct.toFixed(1)}%
                    <span className="cv-port-card-basis">{basisJpy != null ? '매입대비' : '전일대비'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 인터랙티브 일별 차트 ---------------- */

function PortfolioChart({
  history,
  format,
  selIdx,
  onSelect,
}: {
  history: HistPoint[];
  format: (jpy: number) => string;
  selIdx: number | null;
  onSelect: (i: number | null) => void;
}) {
  if (history.length < 2)
    return <div className="cv-port-msg" style={{ fontSize: 10 }}>일별 데이터가 2일 이상 쌓이면 차트가 표시돼요</div>;

  const W = 320;
  const H = 120;
  const PAD = 6;
  const vals = history.map((h) => h.totalJpy);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const step = (W - PAD * 2) / (history.length - 1);
  const xy = (i: number) => ({
    x: PAD + i * step,
    y: H - PAD - ((history[i].totalJpy - min) / span) * (H - PAD * 2),
  });
  const d = history.map((_, i) => {
    const { x, y } = xy(i);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const overallUp = vals[vals.length - 1] >= vals[0];
  const stroke = overallUp ? '#22C55E' : '#E63946';

  const sel = selIdx != null && selIdx >= 0 && selIdx < history.length ? selIdx : null;
  const selPrev = sel != null && sel > 0 ? history[sel - 1].totalJpy : null;
  const selVal = sel != null ? history[sel].totalJpy : null;
  const selPct = sel != null && selPrev && selPrev > 0 ? ((history[sel].totalJpy - selPrev) / selPrev) * 100 : null;

  return (
    <div className="cv-port-chart">
      {sel != null ? (
        <div className="cv-port-chart-detail">
          <span className="cv-port-chart-date">{history[sel].date}</span>
          <span className="cv-port-chart-amt">{format(selVal ?? 0)}</span>
          {selPct != null && (
            <span className={selPct >= 0 ? 'cv-port-up' : 'cv-port-down'}>
              {selPct >= 0 ? '▲ +' : '▼ '}
              {selPct.toFixed(2)}%
            </span>
          )}
        </div>
      ) : (
        <div className="cv-port-chart-detail cv-port-chart-hint">차트의 점을 눌러 그 날의 금액·등락률을 확인하세요</div>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', touchAction: 'none' }}
      >
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
        {history.map((_, i) => {
          const { x, y } = xy(i);
          const isSel = i === sel;
          return (
            <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
              {/* 넓은 투명 히트영역 */}
              <rect x={x - step / 2} y={0} width={step} height={H} fill="transparent" />
              {isSel && <line x1={x} y1={0} x2={x} y2={H} stroke="var(--ink3)" strokeWidth={1} strokeDasharray="3 3" />}
              <circle cx={x} cy={y} r={isSel ? 4 : 2} fill={isSel ? 'var(--ink)' : stroke} />
            </g>
          );
        })}
      </svg>
      <div className="cv-port-chart-axis">
        <span>{history[0].date}</span>
        <span>최근 {history.length}일</span>
        <span>{history[history.length - 1].date}</span>
      </div>
    </div>
  );
}

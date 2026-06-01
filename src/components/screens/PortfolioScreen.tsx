'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const UP = '#22C55E';
const DOWN = '#E63946';

export function PortfolioScreen() {
  const { format, rate } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const [port, setPort] = useState<PortfolioData | null>(null);
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sort, setSort] = useState<'value' | 'change'>('value');

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

  const rows = useMemo(() => {
    if (!cards) return [];
    const mapped = cards.map((c) => {
      const curJpy = usePsa10 && c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : c.priceSingleJpy;
      const qty = Math.max(1, c.qty || 1);
      const basisJpy =
        c.buyPrice != null && c.buyPrice > 0
          ? c.buyCurrency === 'JPY'
            ? c.buyPrice
            : c.buyPrice / (rate || 1)
          : null;
      const profitPct = basisJpy && curJpy > 0 ? ((curJpy - basisJpy) / basisJpy) * 100 : null;
      const t = c.trend ?? [];
      const dayPct =
        t.length >= 2 && t[t.length - 2] > 0 ? ((t[t.length - 1] - t[t.length - 2]) / t[t.length - 2]) * 100 : null;
      return { c, curJpy, qty, basisJpy, profitPct, dayPct, changePct: profitPct ?? dayPct };
    });
    mapped.sort((a, b) =>
      sort === 'value' ? b.curJpy * b.qty - a.curJpy * a.qty : (b.changePct ?? -999) - (a.changePct ?? -999),
    );
    return mapped;
  }, [cards, usePsa10, rate, sort]);

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

  if (err) return <div className="cv-pf-msg">⚠ {err}</div>;
  if (!port || !cards) return <div className="cv-pf-msg">불러오는 중…</div>;
  if (port.totalCount === 0)
    return (
      <div className="cv-pf-msg">
        아직 보유 카드가 없어요.
        <br />
        <Link href="/cards/add" style={{ color: '#7FB0FF', textDecoration: 'underline' }}>
          카드 추가하러 가기 →
        </Link>
      </div>
    );

  const totalJpy = usePsa10 && port.totalPsa10Jpy > 0 ? port.totalPsa10Jpy : port.totalJpy;
  const up = (port.changePct ?? 0) >= 0;
  const gradedCount = cards.filter((c) => c.graded).length;

  return (
    <div className="cv-pf">
      {/* ═══ 평가액 인포그래픽 (홈 TOTAL PORTFOLIO 박스 확장판) ═══ */}
      <div className="cv-pf-hero">
        <div className="cv-pf-scan" />
        <span className="cv-pf-br tl" /><span className="cv-pf-br tr" />
        <span className="cv-pf-br bl" /><span className="cv-pf-br br" />

        <div className="cv-pf-hero-label">TOTAL PORTFOLIO{usePsa10 ? ' · PSA10' : ''}</div>
        <div className="cv-pf-hero-valrow">
          <span className="cv-pf-hero-val">{format(totalJpy)}</span>
          {port.changePct != null && (
            <span className="cv-pf-chg" style={{ color: up ? UP : DOWN }}>
              <span className="cv-pf-tri" style={{ borderBottomColor: up ? UP : 'transparent', borderTopColor: up ? 'transparent' : DOWN }} />
              {up ? '+' : ''}{port.changePct.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="cv-pf-hero-sub">
          {port.changeAbsJpy != null && (
            <span style={{ color: up ? UP : DOWN }}>
              {up ? '+' : '-'}{format(Math.abs(port.changeAbsJpy))}{' '}
            </span>
          )}
          vs 어제 (KST 정각)
        </div>

        {/* 큰 인터랙티브 차트 */}
        <PortfolioChart history={port.history} format={format} />

        {/* 통계 칩 */}
        <div className="cv-pf-chips">
          <Chip label="보유" value={`${cards.length}장`} color="rgba(255,255,255,.85)" />
          <Chip label="시세반영" value={`${port.pricedCount}/${port.totalCount}`} color="#7FB0FF" />
          <Chip label="그레이딩" value={`${gradedCount}건`} color="#A78BFA" />
          {totals.pct != null ? (
            <Chip
              label="평가손익"
              value={`${totals.pct >= 0 ? '+' : ''}${totals.pct.toFixed(1)}%`}
              color={totals.profit >= 0 ? UP : DOWN}
            />
          ) : (
            <Chip label="매입가" value="미입력" color="rgba(255,255,255,.4)" />
          )}
        </div>

        {totals.pct != null && (
          <div className="cv-pf-invest">
            매입 <b>{format(totals.invested)}</b> → 현재 <b>{format(totals.current)}</b>
            <span style={{ color: totals.profit >= 0 ? UP : DOWN, marginLeft: 6 }}>
              {totals.profit >= 0 ? '+' : '-'}{format(Math.abs(totals.profit))}
            </span>
          </div>
        )}
      </div>

      {/* ═══ 보유 카드 — 주식 종목 리스트 ═══ */}
      <div className="cv-pf-listhead">
        <span>보유 종목 {rows.length}</span>
        <div className="cv-pf-sort">
          {(['value', 'change'] as const).map((s) => (
            <button key={s} type="button" className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
              {s === 'value' ? '평가액순' : '등락순'}
            </button>
          ))}
        </div>
      </div>

      <div className="cv-pf-list">
        {rows.map(({ c, curJpy, qty, changePct, basisJpy }) => {
          const img = c.snkrdunkImageUrl || c.photoUrl || null;
          const name = c.snkrdunkName || c.nickname || '이름 미상';
          const cu = (changePct ?? 0) >= 0;
          return (
            <div key={c.id} className="cv-pf-row">
              <div className="cv-pf-thumb">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={name} />
                ) : (
                  <span>🃏</span>
                )}
              </div>
              <div className="cv-pf-rowmid">
                <div className="cv-pf-rowname">
                  {name}
                  {c.graded && <span className="cv-pf-badge">{c.gradeCompany ?? 'PSA'} {c.gradeValue ?? ''}</span>}
                </div>
                <div className="cv-pf-rowsub">
                  {[c.ocrSetCode?.toUpperCase(), c.ocrCardNumber].filter(Boolean).join(' · ')}
                  {qty > 1 ? ` · ×${qty}` : ''}
                  {c.selfPulled ? ' · 직접뽑기' : ''}
                </div>
              </div>
              <Spark trend={c.trend ?? []} up={cu} />
              <div className="cv-pf-rowprice">
                <div className="cv-pf-rowcur">{curJpy > 0 ? format(curJpy) : '—'}</div>
                {changePct != null ? (
                  <div className="cv-pf-rowchg" style={{ color: cu ? UP : DOWN }}>
                    {cu ? '▲' : '▼'} {cu ? '+' : ''}{changePct.toFixed(1)}%
                    <span className="cv-pf-rowbasis">{basisJpy != null ? '매입' : '전일'}</span>
                  </div>
                ) : (
                  <div className="cv-pf-rowchg" style={{ color: 'rgba(255,255,255,.3)' }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="cv-pf-chip">
      <div className="cv-pf-chip-v" style={{ color }}>{value}</div>
      <div className="cv-pf-chip-l">{label}</div>
    </div>
  );
}

/** 카드별 미니 스파크라인 (trend). */
function Spark({ trend, up }: { trend: number[]; up: boolean }) {
  const pts = (trend ?? []).filter((n) => typeof n === 'number' && n > 0);
  if (pts.length < 2) return <div className="cv-pf-spark" />;
  const W = 44;
  const H = 22;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const step = W / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(H - 2 - ((v - min) / span) * (H - 4)).toFixed(1)}`).join(' ');
  return (
    <svg className="cv-pf-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={d} fill="none" stroke={up ? UP : DOWN} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── 인터랙티브 차트 (호버 툴팁 + 클릭 핀) ───────── */

function PortfolioChart({ history, format }: { history: HistPoint[]; format: (jpy: number) => string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  if (history.length < 2) {
    return <div className="cv-pf-chart-empty">일별 데이터가 2일 이상 쌓이면 차트가 표시돼요</div>;
  }

  const W = 320;
  const H = 150;
  const PAD = 6;
  const n = history.length;
  const vals = history.map((h) => h.totalJpy);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const step = (W - PAD * 2) / (n - 1);
  const xOf = (i: number) => PAD + i * step;
  const yOf = (i: number) => H - PAD - ((history[i].totalJpy - min) / span) * (H - PAD * 2);
  const line = history.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(i).toFixed(1)}`).join(' ');
  const area = `${line} L ${xOf(n - 1).toFixed(1)} ${H} L ${xOf(0).toFixed(1)} ${H} Z`;
  const overallUp = vals[n - 1] >= vals[0];
  const stroke = overallUp ? UP : DOWN;

  const active = hover ?? pinned;
  const aPrev = active != null && active > 0 ? history[active - 1].totalJpy : null;
  const aPct = active != null && aPrev && aPrev > 0 ? ((history[active].totalJpy - aPrev) / aPrev) * 100 : null;

  const idxFromClientX = (clientX: number): number => {
    const el = wrapRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(frac * (n - 1));
  };

  return (
    <div
      ref={wrapRef}
      className="cv-pf-chart"
      onMouseMove={(e) => setHover(idxFromClientX(e.clientX))}
      onMouseLeave={() => setHover(null)}
      onClick={(e) => setPinned(idxFromClientX(e.clientX))}
      onTouchStart={(e) => { if (e.touches[0]) setPinned(idxFromClientX(e.touches[0].clientX)); }}
      onTouchMove={(e) => { if (e.touches[0]) setHover(idxFromClientX(e.touches[0].clientX)); }}
      onTouchEnd={() => setHover(null)}
    >
      {/* 툴팁 */}
      {active != null && (
        <div
          className="cv-pf-tip"
          style={{ left: `${(active / (n - 1)) * 100}%` }}
        >
          <div className="cv-pf-tip-date">{history[active].date}</div>
          <div className="cv-pf-tip-amt">{format(history[active].totalJpy)}</div>
          {aPct != null && (
            <div className="cv-pf-tip-pct" style={{ color: aPct >= 0 ? UP : DOWN }}>
              {aPct >= 0 ? '▲ +' : '▼ '}{aPct.toFixed(2)}%
            </div>
          )}
        </div>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', touchAction: 'none' }}>
        <defs>
          <linearGradient id="pfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pfFill)" stroke="none" />
        <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
        {active != null && (
          <>
            <line x1={xOf(active)} y1={0} x2={xOf(active)} y2={H} stroke="rgba(255,255,255,.35)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={xOf(active)} cy={yOf(active)} r={4} fill="#fff" stroke={stroke} strokeWidth={2} />
          </>
        )}
      </svg>
      <div className="cv-pf-axis">
        <span>{history[0].date}</span>
        <span>최근 {n}일 · 탭/호버로 상세</span>
        <span>{history[n - 1].date}</span>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/components/PriceModeProvider';
import { PortfolioLoginGate } from '@/components/PortfolioTotal';
import { useTheme } from '@/components/ThemeProvider';
import { Panel } from '@/components/ui/Panel';
import { isFlatTheme } from '@/lib/theme';
import {
  buildHeroData,
  PORTFOLIO_MODE_LABEL,
  type PortfolioChartMode,
  type PortfolioPoint,
  type ServerPortfolio,
} from '@/lib/portfolioHero';
import type { MyCardWithPrice } from '@/lib/queries';

const POINTS = 1280;
const TRADES_THIS_WEEK = 3;

const PORTFOLIO_MODE_HELP: Record<PortfolioChartMode, string> = {
  day: '일별 평가액',
  week: '주별 평가액',
  month: '월별 평가액',
};

interface Props {
  cards: MyCardWithPrice[];
  isLoggedIn: boolean;
}

/**
 * 토탈 포트폴리오 hero — 클린=라이트 / 다크=사이버 주식창 / 그 외=픽셀 보드.
 * 홈(메인) 과 내 컬렉션 상단에서 동일하게 재사용한다.
 * 클릭하면 전체 포트폴리오(/my/portfolio) 로 이동. 미로그인 시 dim 오버레이.
 */
export function PortfolioHero({ cards, isLoggedIn }: Props) {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const router = useRouter();
  const { mode: globalPriceMode } = usePriceMode();
  const [chartMode, setChartMode] = useState<PortfolioChartMode>('day');

  // 실시간 포트폴리오 — 서버 일별 스냅샷 기반 등락 + history (KST 정각 reset).
  const [portfolio, setPortfolio] = useState<ServerPortfolio | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/portfolio', { credentials: 'include', cache: 'no-store' });
        if (!alive || !r.ok) return;
        const j = (await r.json()) as {
          data?: {
            totalJpy: number;
            totalPsa10Jpy?: number;
            changeAbsJpy: number | null;
            changePct: number | null;
            history?: PortfolioPoint[];
          };
        };
        if (!alive || !j.data) return;
        setPortfolio({
          totalJpy: j.data.totalJpy,
          totalPsa10Jpy: j.data.totalPsa10Jpy ?? 0,
          changeAbsJpy: j.data.changeAbsJpy,
          changePct: j.data.changePct,
          history: j.data.history ?? [],
        });
      } catch {
        /* 비로그인 등 — 폴백 사용 */
      }
    })();
    return () => { alive = false; };
  }, []);

  const { owned, graded, totalVal, change, changePct, chartData } =
    buildHeroData(cards, portfolio, globalPriceMode, chartMode);

  // ═══ 클린: 라이트 ═══
  if (theme === 'clean') {
    return (
      <div
        onClick={() => router.push('/my/portfolio')}
        role="button"
        aria-label="전체 포트폴리오 보기"
        style={{ position: 'relative', background: 'var(--paper)', borderBottom: '8px solid var(--pap2)', cursor: 'pointer' }}
      >
        <div style={{ padding: '18px 18px 8px' }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600, marginBottom: 8 }}>
            내 포트폴리오 평가액
          </div>
          <div className="num" style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{format(totalVal)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 14, fontWeight: 800, color: change >= 0 ? 'var(--red)' : 'var(--blu)' }}>
              {change >= 0 ? '▲' : '▼'} {format(Math.abs(change))}
            </span>
            <span className="num" style={{
              fontSize: 14, fontWeight: 800, color: change >= 0 ? 'var(--red)' : 'var(--blu)',
              background: change >= 0 ? 'var(--red-soft)' : 'var(--blu-soft)', padding: '3px 8px',
            }}>
              {changePct >= 0 ? '+' : ''}{changePct}%
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600 }}>전체 수익률</span>
          </div>
        </div>
        <div style={{ padding: '4px 10px 12px', position: 'relative' }}>
          <ChartModeFloat
            chartMode={chartMode}
            setChartMode={setChartMode}
            tone={{ onBg: 'var(--ink)', onFg: '#fff', offBg: 'var(--pap2)', offFg: 'var(--ink3)' }}
          />
          <PortfolioLineChart data={chartData} clean width={300} height={72} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--pap3)' }}>
          {([
            ['보유', owned.length + '장'],
            ['그레이딩', graded.length + '건'],
            ['포인트', POINTS.toLocaleString() + 'P'],
            ['거래', TRADES_THIS_WEEK + '건'],
          ] as Array<[string, string]>).map(([l, v], i) => (
            <div key={l} style={{ padding: '14px 6px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--pap3)' : 'none' }}>
              <div className="num" style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        {!isLoggedIn && <PortfolioLoginGate />}
      </div>
    );
  }

  // ═══ 다크: 사이버 주식창 ═══
  if (theme === 'dark') {
    return (
      <div
        onClick={() => router.push('/my/portfolio')}
        role="button"
        aria-label="전체 포트폴리오 보기"
        style={{ position: 'relative', background: 'var(--paper)', borderBottom: '8px solid var(--dark)', cursor: 'pointer' }}
      >
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.02em' }}>내 포트폴리오 평가액</div>
          <div className="num" style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8 }}>{format(totalVal)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 14, fontWeight: 800, color: change >= 0 ? 'var(--red)' : 'var(--blu)', textShadow: change >= 0 ? '0 0 12px var(--up-glow)' : '0 0 12px var(--down-glow)' }}>
              {change >= 0 ? '▲' : '▼'} {format(Math.abs(change))}
            </span>
            <span className="num" style={{ fontSize: 14, fontWeight: 800, color: change >= 0 ? 'var(--red)' : 'var(--blu)', background: change >= 0 ? 'var(--red-soft)' : 'var(--blu-soft)', padding: '3px 8px' }}>
              {changePct >= 0 ? '+' : ''}{changePct}%
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600 }}>전체 수익률</span>
          </div>
        </div>
        <div style={{ padding: '8px 16px 0' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>평가액 추이</span>
        </div>
        <div style={{ padding: '6px 0 14px', position: 'relative' }}>
          <ChartModeFloat
            chartMode={chartMode}
            setChartMode={setChartMode}
            tone={{ onBg: 'var(--surf2)', onFg: 'var(--ink)', offBg: 'var(--dark)', offFg: 'var(--ink3)' }}
          />
          <CyberAreaChart data={chartData} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--line2)' }}>
          {([
            ['보유', owned.length + '장'],
            ['그레이딩', graded.length + '건'],
            ['포인트', POINTS.toLocaleString() + 'P'],
            ['거래', TRADES_THIS_WEEK + '건'],
          ] as Array<[string, string]>).map(([l, v], i) => (
            <div key={l} style={{ padding: '14px 6px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--line2)' : 'none' }}>
              <div className="num" style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        {!isLoggedIn && <PortfolioLoginGate />}
      </div>
    );
  }

  // ═══ 그 외: 픽셀 보드 ═══
  return (
    <Panel
      onClick={() => router.push('/my/portfolio')}
      ariaLabel="전체 포트폴리오 보기"
      style={{
        margin: 'var(--gap) var(--gap) var(--cg)',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1B2E89 100%)',
        padding: '18px 16px 16px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}
      pixelShadow="-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 4px 0 rgba(100,130,255,.18),inset 0 -5px 0 rgba(0,0,0,.55),9px 9px 0 var(--ink)"
    >
      {/* 픽셀 장식(스캔라인·코너 브래킷)은 클린에선 숨김 */}
      {!isClean && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.07) 3px 4px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
          <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />
        </>
      )}

      {/* Label + value */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.35)', letterSpacing: 2, marginBottom: 8 }}>
          TOTAL PORTFOLIO
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'var(--f1)', fontSize: 29, color: 'var(--gold)', letterSpacing: -2,
            textShadow: '0 0 24px rgba(255,210,63,.35),4px 4px 0 rgba(0,0,0,.5)', lineHeight: 1,
          }}>
            {format(totalVal)}
          </div>
          <div style={{ paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                borderBottom: changePct >= 0 ? '8px solid #22C55E' : '8px solid transparent',
                borderTop: changePct >= 0 ? 'none' : '8px solid #E63946',
              }} />
              <span style={{ fontFamily: 'var(--f1)', fontSize: 12, color: changePct >= 0 ? '#22C55E' : '#E63946', letterSpacing: .5 }}>
                {changePct >= 0 ? '+' : ''}{changePct}%
              </span>
            </div>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>
              {portfolio?.changePct != null ? 'vs 어제 (KST 정각)' : 'vs 지난주'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart area — 컬렉션 일별 종합 가격 꺾은선 */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <ChartModeFloat
          chartMode={chartMode}
          setChartMode={setChartMode}
          tone={{ onBg: 'var(--gold)', onFg: 'var(--ink)', offBg: 'rgba(255,255,255,.1)', offFg: 'rgba(255,255,255,.55)', radius: 0 }}
        />
        <PortfolioLineChart
          data={chartData}
          width={300}
          height={64}
        />
        <div style={{ marginTop: 5, fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.25)', letterSpacing: .3 }}>
          {PORTFOLIO_MODE_HELP[chartMode]}
        </div>
      </div>

      {/* 4 bottom stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, position: 'relative' }}>
        {[
          { l: '보유', v: owned.length + '장', c: 'rgba(255,255,255,.7)' },
          { l: '그레이딩', v: graded.length + '건', c: '#A78BFA' },
          { l: '포인트', v: POINTS.toLocaleString() + 'P', c: 'var(--gold)' },
          { l: '거래', v: TRADES_THIS_WEEK + '건', c: '#22C55E' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: 'rgba(255,255,255,.05)', padding: '9px 6px', boxShadow: '0 0 0 1px rgba(255,255,255,.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: c, letterSpacing: .3, marginBottom: 5 }}>{v}</div>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', marginTop: 10, textAlign: 'right', fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,210,63,.75)', letterSpacing: 0.5 }}>
        전체 포트폴리오 보기 ▶
      </div>
      {!isLoggedIn && <PortfolioLoginGate />}
    </Panel>
  );
}

/** 차트 우상단에 작게 띄우는 일/주/월 토글(플로팅). */
function ChartModeFloat({
  chartMode,
  setChartMode,
  tone,
}: {
  chartMode: PortfolioChartMode;
  setChartMode: (m: PortfolioChartMode) => void;
  tone: { onBg: string; onFg: string; offBg: string; offFg: string; radius?: number };
}) {
  return (
    <div style={{ position: 'absolute', top: 4, right: 6, zIndex: 3, display: 'flex', gap: 3 }}>
      {(['day', 'week', 'month'] as const).map((mode) => {
        const on = chartMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChartMode(mode); }}
            style={{
              padding: '2px 7px',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1.5,
              letterSpacing: 0.3,
              border: 'none',
              cursor: 'pointer',
              borderRadius: tone.radius ?? 6,
              background: on ? tone.onBg : tone.offBg,
              color: on ? tone.onFg : tone.offFg,
            }}
          >
            {PORTFOLIO_MODE_LABEL[mode]}
          </button>
        );
      })}
    </div>
  );
}

/** 다크(cyber) 포트폴리오 차트 — 네온 면그래프 + 글로우 + 거래량 막대. */
function CyberAreaChart({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div style={{
        height: 78, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: 'var(--ink3)', letterSpacing: 0.3, borderBottom: '1px solid var(--line2)',
      }}>
        시세 이력이 부족합니다
      </div>
    );
  }
  const w = 350, h = 78;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * (h - 8) - 4] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const up = data[data.length - 1] >= data[0];
  const col = up ? '#FF4D6D' : '#36C5FF';
  const glow = up ? 'rgba(255,77,109,.55)' : 'rgba(54,197,255,.55)';
  const vols = data.map((v, i) => (i === 0 ? 0 : Math.abs(v - data[i - 1])));
  const vmax = Math.max(...vols, 1);
  const last = pts[pts.length - 1];
  return (
    <>
      <svg width="100%" height="78" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }} aria-label="평가액 추이">
        <defs>
          <linearGradient id="pf-cyber-hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.22" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pf-cyber-hg)" />
        <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 5px ${glow})` }} />
        <circle cx={last[0]} cy={last[1]} r="3.5" fill={col} style={{ filter: `drop-shadow(0 0 5px ${glow})` }} />
      </svg>
      <div style={{ display: 'flex', gap: 2, height: 22, alignItems: 'flex-end', padding: '4px 0 0' }}>
        {vols.map((v, i) => (
          <div key={i} style={{ flex: 1, height: `${Math.max(8, (v / vmax) * 100)}%`, background: i === vols.length - 1 ? col : 'var(--line2)', opacity: i === vols.length - 1 ? 0.9 : 0.55 }} />
        ))}
      </div>
    </>
  );
}

function PortfolioLineChart({
  data,
  width = 300,
  height = 64,
  clean = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  clean?: boolean;
}) {
  const borderCol = clean ? '1px solid var(--pap3)' : '1px solid rgba(255,255,255,.1)';
  if (data.length < 2) {
    return (
      <div
        style={{
          width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--f1)', fontSize: 10,
          color: clean ? 'var(--ink3)' : 'rgba(255,255,255,.35)', letterSpacing: 0.3,
          borderBottom: borderCol,
        }}
      >
        시세 이력이 부족합니다
      </div>
    );
  }

  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const stepX = innerW / (data.length - 1);
  const xOf = (i: number) => pad + i * stepX;
  const yOf = (v: number) => pad + innerH - ((v - minV) / range) * innerH;

  const pointsAttr = data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const areaPath = [
    `M${pad},${pad + innerH}`,
    ...data.map((v, i) => `L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`),
    `L${pad + innerW},${pad + innerH}`,
    'Z',
  ].join(' ');

  const lastV = data[data.length - 1];
  const lastX = xOf(data.length - 1);
  const lastY = yOf(lastV);
  const trendUp = lastV >= data[0];
  const stroke = clean
    ? (trendUp ? 'var(--red)' : 'var(--blu)')
    : (trendUp ? 'var(--gold)' : '#E63946');
  const fill = clean
    ? (trendUp ? 'rgba(242,54,69,0.14)' : 'rgba(47,107,255,0.12)')
    : (trendUp ? 'rgba(255,210,63,0.22)' : 'rgba(230,57,70,0.18)');

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', borderBottom: borderCol }}
      aria-label="포트폴리오 차트"
    >
      <path d={areaPath} fill={fill} stroke="none" />
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 최신 시점 강조 */}
      <circle cx={lastX} cy={lastY} r={3.2} fill={stroke} stroke={clean ? '#fff' : 'var(--ink)'} strokeWidth={1} />
    </svg>
  );
}

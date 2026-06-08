'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AppBarUser } from '@/components/AppBarUser';
import { useCurrency } from '@/components/CurrencyProvider';
import { useHomePrefs } from '@/components/HomePrefsProvider';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import { HomeKoSearchBar } from '@/components/HomeKoSearchBar';
import { PortfolioHero } from '@/components/PortfolioHero';
import { usePriceMode } from '@/components/PriceModeProvider';
import { AppBar } from '@/components/ui/AppBar';
import { Panel } from '@/components/ui/Panel';
import { StatusBar } from '@/components/ui/StatusBar';
import { useTheme } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { buildHeroData, type ServerPortfolio } from '@/lib/portfolioHero';
import type { MyCardWithPrice } from '@/lib/queries';

// ── 바로가기 클린 라인 아이콘 ───────────────────────────────────────────
// 모든 박스 테두리/그림자는 <Panel> 이 테마별로 관리한다(픽셀 인라인 섀도우 금지).

// 바로가기 색 키 → 클린 라인 아이콘 색(강/소프트 면).
const CLEAN_ICON_COLORS: Record<string, { fg: string; bg: string }> = {
  'var(--grn)': { fg: 'var(--accent)', bg: 'var(--accent-soft)' },
  'var(--gold)': { fg: 'var(--gold)', bg: 'var(--gold-soft)' },
  'var(--blu)': { fg: 'var(--blu)', bg: 'var(--blu-soft)' },
  'var(--red)': { fg: 'var(--red)', bg: 'var(--red-soft)' },
};

const lineIcon = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ScanLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4 9V6.5A1.5 1.5 0 0 1 5.5 5H8" />
      <path d="M16 5h2.5A1.5 1.5 0 0 1 20 6.5V9" />
      <path d="M20 15v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 19H5.5A1.5 1.5 0 0 1 4 17.5V15" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PriceLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4 13.5 11.5 6H18a1 1 0 0 1 1 1v6.5L11.5 21z" />
      <circle cx="14.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function AuctionLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M13.5 3.5 19 9l-2.5 2.5L11 6z" />
      <path d="M11.5 7.5 5 14" />
      <path d="M8 10.5 12 14.5" />
      <path d="M4 20.5h9" />
    </svg>
  );
}
function MarketLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4.5 9 6 5h12l1.5 4" />
      <path d="M4.5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 3 0" />
      <path d="M5.5 11v8h13v-8" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}
function TradeLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M5 8h12" />
      <path d="M14 5 17 8l-3 3" />
      <path d="M19 16H7" />
      <path d="M10 13 7 16l3 3" />
    </svg>
  );
}

export type SnkrdunkCategory = 'SAR' | '프로모' | 'SR' | '원피스';

export interface SnkrdunkRow {
  apparelId: number;
  shortName: string;
  /** 일본어 원문 (소제목 노출용). 비어 있으면 표시 생략. */
  localizedName?: string;
  category: SnkrdunkCategory | null;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

export interface PackHitCardRow {
  apparelId: number;
  shortName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

export interface PackRow {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
  hits: PackHitCardRow[];
  boxes?: PackHitCardRow[];
}

interface Props {
  cards: MyCardWithPrice[];
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
  snkrdunkRows?: SnkrdunkRow[];
  packs?: PackRow[];
}

const SNKR_CAT_BG: Record<SnkrdunkCategory, string> = {
  SAR: 'var(--orn)',
  프로모: 'var(--pur)',
  SR: 'var(--red)',
  원피스: 'var(--grn-dk)',
};
const SNKR_FALLBACK_BG = 'var(--ink2)';

type Rarity = 'C' | 'U' | 'R' | 'SR' | 'HR' | 'S';

const RAR_ORDER: Rarity[] = ['C', 'U', 'R', 'SR', 'HR', 'S'];
const RAR_COLORS: Record<Rarity, string> = {
  C: '#475569', U: '#22C55E', R: '#3A5BD9', SR: '#7C3AED', HR: '#EC4899', S: '#FFD23F',
};

const GAME_COLORS: Record<string, string> = {
  포켓몬: '#E63946', 유희왕: '#7C3AED', 원피스: '#F97316',
  MTG: '#22C55E', 스포츠: '#3A5BD9', 기타: '#94A3B8',
};

const POINTS = 1280;
const LEVEL_LABEL = 'LV.12 다이아 컬렉터';
const XP_CURRENT = 340;
const XP_MAX = 500;
const XP_WEEK = 80;
const TRADES_THIS_WEEK = 3;

function KoreaMarketIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden
      style={{ display: 'block', shapeRendering: 'crispEdges' }}
    >
      <rect x="3" y="7" width="16" height="12" fill="#0F172A" />
      <rect x="5" y="9" width="12" height="8" fill="#FFFFFF" />
      <rect x="7" y="4" width="8" height="3" fill="#0F172A" />
      <rect x="8" y="2" width="6" height="3" fill="#FFFFFF" />
      <rect x="9" y="11" width="4" height="4" fill="#E63946" />
      <rect x="11" y="13" width="4" height="4" fill="#3A5BD9" />
      <rect x="6" y="11" width="2" height="2" fill="#0F172A" />
      <rect x="15" y="14" width="2" height="2" fill="#0F172A" />
    </svg>
  );
}
const ACTIVITY = [
  { icon: '🔥', c: 'var(--grn)', txt: '리자몽 EX 가격 ▲ +8%', time: '10분 전', pt: '+5P' },
  { icon: '📷', c: 'var(--blu)', txt: '카이바 슈라이 스캔 완료', time: '1시간 전', pt: '+10P' },
  { icon: '🤝', c: 'var(--gold)', txt: '피카츄 VMAX 거래 완료', time: '3시간 전', pt: '+15P' },
  { icon: '⭐', c: 'var(--pur)', txt: '레벨업! LV.12 달성', time: '어제', pt: '+50P' },
];

function fmt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Math.round(n).toLocaleString();
}

export function DashboardScreen({ cards, heroBanners, isLoggedIn, snkrdunkRows = [], packs = [] }: Props) {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const [activeGame, setActiveGame] = useState<string>('전체');
  // 메인에 포트폴리오 hero 표시 여부 (기본 off). off 면 순서: 레벨→바로가기→검색→인기.
  const { showPortfolioOnMain } = useHomePrefs();

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
            history?: Array<{ date: string; totalJpy: number }>;
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
        /* 비로그인 등 — 폴백 (computeDailyTotals) 사용 */
      }
    })();
    return () => { alive = false; };
  }, []);

  // 핵심 지표·게임별 현황 표시용 집계 — hero 와 동일 계산식(lib/portfolioHero).
  const { mode: globalPriceMode } = usePriceMode();
  const { owned, graded, topCards, totalVal, changePct } = buildHeroData(
    cards,
    portfolio,
    globalPriceMode,
    'day',
  );

  const gamesPresent = Array.from(new Set(owned.map((c) => c.game)));
  const gameDist = gamesPresent.map((g) => ({
    g,
    n: owned.filter((c) => c.game === g).length,
    val: owned.filter((c) => c.game === g).reduce((a, c) => a + c.price, 0),
  }));

  // 메인 상단 재배치 대상 섹션 — ON: 검색→바로가기→레벨, OFF: 레벨→바로가기→검색(→인기).
  const searchNode = (
    <div style={{ margin: '0 var(--gap) var(--cg)' }}>
      <div className="sect-hd" style={{ marginBottom: 8 }}><h2>카드 검색</h2></div>
      <HomeKoSearchBar />
    </div>
  );

  const shortcutsNode = (
    <div style={{ margin: '0 var(--gap) var(--cg)' }}>
      <div className="sect-hd" style={{ marginBottom: 8 }}><h2>바로가기</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
        {([
          { icon: '📷' as ReactNode, cleanIcon: <ScanLineIcon />, lb: '스캔', bg: 'var(--grn)', href: '/cards/grading' },
          { icon: '¥' as ReactNode, cleanIcon: <PriceLineIcon />, lb: '시세확인', bg: 'var(--gold)', href: '/cards/packs' },
          { icon: '🔨' as ReactNode, cleanIcon: <AuctionLineIcon />, lb: 'MVC경매', bg: 'var(--blu)', href: '/cards/mvc-auction' },
          { icon: <KoreaMarketIcon />, cleanIcon: <MarketLineIcon />, lb: '국내마켓', bg: 'var(--red)', href: '/cards/bunjang' },
          { icon: '🤝' as ReactNode, cleanIcon: <TradeLineIcon />, lb: '거래', bg: 'var(--grn)', href: '/trade' },
        ]).map(({ icon, cleanIcon, lb, bg, href }) => {
          const cc = CLEAN_ICON_COLORS[bg] ?? CLEAN_ICON_COLORS['var(--grn)'];
          return (
            <Link key={lb} href={href} className="dash-quick">
              <div style={isClean
                ? {
                    width: 40, height: 40, borderRadius: 14, background: cc.bg, color: cc.fg,
                    display: 'grid', placeItems: 'center',
                  }
                : {
                    width: 32, height: 32, background: bg, display: 'grid', placeItems: 'center', fontSize: 17,
                    boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.3),inset 0 -2px 0 rgba(0,0,0,.25),3px 3px 0 var(--ink)',
                  }}>
                {isClean ? cleanIcon : icon}
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 12, lineHeight: 1.1, letterSpacing: 0, whiteSpace: 'nowrap' }}>{lb}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const levelNode = (
    <Panel style={{ margin: '0 var(--gap) var(--cg)', padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink)',
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {LEVEL_LABEL}
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--pap2)',
            height: 8,
            position: 'relative',
            boxShadow: 'inset 1px 1px 0 rgba(0,0,0,.15)',
          }}
        >
          <div
            style={{
              width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg,var(--pur),var(--gold))',
            }}
          />
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', flexShrink: 0 }}>
          {XP_CURRENT}/{XP_MAX}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--gold-dk)', flexShrink: 0 }}>
          🪙{POINTS.toLocaleString()}
        </div>
      </div>
    </Panel>
  );

  // 인기 카드 — off 면 자동 무한 좌측 스크롤(로테이션). 다크는 종목 리스트(스크롤 미적용).
  const popularNode = snkrdunkRows.length > 0 ? (
    <PopularCardsSection
      rows={snkrdunkRows}
      theme={theme}
      isClean={isClean}
      format={format}
      autoScroll={!showPortfolioOnMain}
    />
  ) : null;

  // 레벨 아래 한 줄짜리 작은 히어로(프로모) 배너.
  const bannerNode = <HeroSlider slides={heroBanners} compact />;

  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarUser />} />

      {/* ═══ 다크(주식창): 실시간 인기 티커 바 ═══ */}
      {theme === 'dark' && snkrdunkRows.length > 0 && (
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--line2)', background: 'var(--dark)' }}>
          <div style={{ flexShrink: 0, padding: '9px 14px', borderRight: '1px solid var(--line2)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--blu)' }}>🔥 실시간 인기</span>
          </div>
          {snkrdunkRows.slice(0, 8).map((r) => (
            <Link
              key={r.apparelId}
              href={`/cards/snkrdunk/${r.apparelId}`}
              style={{ flexShrink: 0, padding: '9px 13px', borderRight: '1px solid var(--line2)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.shortName}</span>
              <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{r.minPrice > 0 ? format(r.minPrice) : '—'}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ═══ HERO: PORTFOLIO ═══ 메인 표시 ON 일 때만 (기본 off) */}
      {showPortfolioOnMain && <PortfolioHero cards={cards} isLoggedIn={isLoggedIn} />}

      {/* ═══ 상단 그룹 ═══
          ON : 검색 → 바로가기 → 레벨
          OFF: 레벨 → 히어로배너(작게) → 바로가기 → 카드검색 → 인기카드 */}
      {showPortfolioOnMain ? (
        <>
          {searchNode}
          {shortcutsNode}
          {levelNode}
        </>
      ) : (
        <>
          {levelNode}
          {bannerNode}
          {shortcutsNode}
          {searchNode}
          {popularNode}
        </>
      )}

      {/* ═══ 2×2 KEY METRICS ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>핵심 지표</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Block label="컬렉션 가치" value={format(totalVal)} sub={`▲ +${changePct}% 지난주`} color="var(--gold-dk)" icon="💰" />
          <Block label="그레이딩률" value={`${owned.length > 0 ? Math.round((graded.length / owned.length) * 100) : 0}%`} sub={`${graded.length} / ${owned.length}장`} color="var(--pur)" icon="🏆" />
          <Block label="최고가 카드" value={format(topCards[0]?.price || 0)} sub={topCards[0]?.name} color="var(--grn-dk)" icon="🎯" />
          <Block label="이번주 거래" value={`${TRADES_THIS_WEEK}건`} sub="+45P 포인트 획득" color="var(--blu)" icon="🤝" href="/feed" />
        </div>
      </div>

      {/* ═══ GAME DISTRIBUTION ═══ */}
      {gameDist.length > 0 && (
        <div className="sect">
          <div className="sect-hd"><h2>게임별 현황</h2></div>
          {/* Game selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10, paddingBottom: 2 }}>
            {['전체', ...gameDist.map((x) => x.g)].map((g) => {
              const on = activeGame === g;
              const gameColor = g !== '전체' ? GAME_COLORS[g] || 'var(--white)' : 'var(--white)';
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGame(g)}
                  style={{
                    flexShrink: 0, fontFamily: 'var(--f1)', fontSize: 10, padding: '6px 11px', cursor: 'pointer',
                    letterSpacing: .3,
                    ...(isClean
                      ? {
                          borderRadius: 'var(--r-pill)',
                          border: `1px solid ${on ? 'transparent' : 'var(--pap3)'}`,
                          background: on ? (g !== '전체' ? gameColor : 'var(--accent)') : 'var(--white)',
                          color: on ? 'var(--white)' : 'var(--ink2)',
                          fontWeight: 700,
                          boxShadow: 'none',
                        }
                      : {
                          border: 'none',
                          background: on ? 'var(--ink)' : gameColor,
                          color: on ? 'var(--gold)' : (g !== '전체' ? 'var(--white)' : 'var(--ink)'),
                          boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                        }),
                  }}
                >
                  {g === '전체' ? 'ALL' : g}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(activeGame === '전체' ? gameDist : gameDist.filter((x) => x.g === activeGame)).map(({ g, n, val }) => {
              const pct = owned.length > 0 ? Math.round((n / owned.length) * 100) : 0;
              const gGraded = owned.filter((c) => c.game === g && c.grade !== null).length;
              return (
                <Panel key={g} style={{
                  padding: '12px 12px',
                  // 클린에선 상단 색 액센트 제거 → 바로가기/핵심지표와 동일한 평평한 박스
                  ...(isClean ? {} : { borderTop: `4px solid ${GAME_COLORS[g] || 'var(--ink)'}` }),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: .3 }}>{g}</div>
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: 'var(--ink3)', letterSpacing: .3 }}>{pct}%</div>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 21, letterSpacing: -1, color: 'var(--ink)', marginBottom: 4 }}>
                    {n}<span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 4 }}>장</span>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: 'var(--grn-dk)', letterSpacing: .3, marginBottom: 8 }}>{format(val)}</div>
                  {/* rarity fill bar */}
                  <div style={{ display: 'flex', gap: 2, height: 8 }}>
                    {RAR_ORDER.map((r) => {
                      const rn = owned.filter((c) => c.game === g && c.rar === r).length;
                      if (!rn) return null;
                      return (
                        <div key={r} style={{
                          flex: rn, height: '100%', background: RAR_COLORS[r],
                          boxShadow: '-1px 0 0 var(--ink),0 -1px 0 var(--ink)',
                        }} />
                      );
                    })}
                  </div>
                  {gGraded > 0 && (
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--gold-dk)', marginTop: 6, letterSpacing: .3 }}>
                      🏆 그레이딩 {gGraded}건
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 인기 카드들 ═══ ON: 지표·게임 뒤 / OFF: 검색 다음(자동 좌측 스크롤) */}
      {showPortfolioOnMain && popularNode}

      {/* ═══ ACTIVITY LOG ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>최근 활동</h2></div>
        <Panel style={{ padding: '14px 14px 6px' }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < ACTIVITY.length - 1
                ? (isClean ? '1px solid var(--line2)' : '2px solid var(--bg3)')
                : 'none',
            }}>
              <div style={isClean
                ? {
                    width: 34, height: 34, borderRadius: 12, background: a.c, color: 'var(--white)',
                    display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0,
                  }
                : {
                    width: 32, height: 32, background: a.c, display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0,
                    boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.3),3px 3px 0 var(--ink)',
                  }}>
                {a.icon}
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: .3, lineHeight: 1.5 }}>{a.txt}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--gold-dk)', letterSpacing: .3 }}>{a.pt}</div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', letterSpacing: .3 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="bggap" />
    </>
  );
}

interface BlockProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
  href?: string;
}

function Block({ label, value, sub, color, icon, href }: BlockProps) {
  const inner = (
    <>
      {icon && <div style={{ position: 'absolute', right: 10, top: 10, fontSize: 19, opacity: .15 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', letterSpacing: .5 }}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 19,
          color: color || 'var(--ink)',
          letterSpacing: -1,
          lineHeight: 1.1,
          textShadow: color ? '1px 1px 0 rgba(0,0,0,.15)' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      )}
    </>
  );
  // 4 칸 동일 높이 — minHeight 로 통일. 박스 테두리/그림자는 Panel 이 테마별로.
  const baseStyle: React.CSSProperties = {
    padding: '14px 12px',
    minHeight: 96,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 5,
    position: 'relative',
    overflow: 'hidden',
  };
  return (
    <Panel href={href} style={baseStyle}>
      {inner}
    </Panel>
  );
}

function PackHitsSectionBlock({ pack }: { pack: PackRow }) {
  const { format } = useCurrency();
  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: pack.bg, color: 'var(--white)',
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.45),inset 0 -2px 0 rgba(0,0,0,.25),4px 4px 0 var(--ink)',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 19 }}>{pack.emoji}</span>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 0.5, flex: 1 }}>{pack.shortName}</span>
        {pack.releasedAt ? (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, opacity: 0.8, letterSpacing: 0.3 }}>
            {pack.releasedAt.slice(0, 7).replace('-', '.')}
          </span>
        ) : null}
        <Link
          href={`/cards/packs/${pack.code}`}
          style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--white)', letterSpacing: 0.3, textDecoration: 'underline' }}
        >
          전체 ▶
        </Link>
      </div>
      {pack.hits.length === 0 ? (
        <div
          style={{
            padding: 24, textAlign: 'center', background: 'var(--white)',
            fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          매물 확인 중…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            paddingBottom: 4,
          }}
        >
          {pack.hits.map((hit) => (
            <Link
              key={hit.apparelId}
              href={`/cards/snkrdunk/${hit.apparelId}`}
              style={{
                minWidth: 0, textDecoration: 'none', color: 'inherit',
                background: 'var(--white)',
                boxShadow:
                  '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.7),5px 5px 0 var(--ink)',
                borderTop: `4px solid ${pack.bg}`,
              }}
            >
              <div
                style={{
                  height: 92, background: 'var(--pap2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {hit.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hit.imageUrl} alt={hit.shortName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 33 }}>🃏</span>
                )}
              </div>
              <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.2, marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {hit.shortName}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
                  {hit.minPrice > 0 ? format(hit.minPrice) : '—'}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 3, letterSpacing: 0.3, minHeight: 11 }}>
                  {hit.listingCountText ? `매물 ${hit.listingCountText}건` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 인기 카드 섹션 — 다크=실시간 시세 종목 리스트 / 그 외=인기 카드 가로 캐러셀.
 * autoScroll=true 면 캐러셀이 자동으로 천천히 왼쪽으로 무한 스크롤(로테이션).
 * 카드를 두 벌 이어붙여 끝에 도달하면 절반만큼 되돌려 끊김 없이 루프한다.
 * 사용자가 손으로 만지는 동안(pointer/hover)에는 멈춘다.
 */
function PopularCardsSection({
  rows,
  theme,
  isClean,
  format,
  autoScroll,
}: {
  rows: SnkrdunkRow[];
  theme: string;
  isClean: boolean;
  format: (jpy: number) => string;
  autoScroll: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const carousel = theme !== 'dark';

  useEffect(() => {
    if (!autoScroll || !carousel) return;
    const el = scrollRef.current;
    if (!el) return;
    // scrollLeft 의 getter 는 정수로 반올림되므로 0.x 씩 더하면 누적되지 않는다.
    // float 누적기(acc)를 따로 두고 매 프레임 el.scrollLeft 에 대입해야 움직인다.
    let raf = 0;
    let paused = false;
    let acc = el.scrollLeft;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; acc = el.scrollLeft; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });
    let last = 0;
    const step = (t: number) => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        const dt = last ? t - last : 16;
        const half = el.scrollWidth / 2; // 카드를 두 벌 이어붙였으므로 절반 지점에서 되돌림
        acc += (dt / 1000) * 28; // ~28px/s, 천천히
        if (half > 0 && acc >= half) acc -= half;
        el.scrollLeft = acc;
      }
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [autoScroll, carousel, rows.length]);

  if (theme === 'dark') {
    return (
      <div className="sect">
        <div className="sect-hd">
          <h2>실시간 시세</h2>
          <Link href="/cards/snkrdunk" className="more">전체 ▶</Link>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid var(--pap3)', background: 'var(--dark)' }}>
            <span style={{ width: 20, fontSize: 10, color: 'var(--ink4)', fontWeight: 700, textAlign: 'center' }}>#</span>
            <span style={{ flex: 1, fontSize: 10, color: 'var(--ink4)', fontWeight: 700 }}>카드명</span>
            <span style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 700 }}>현재가</span>
          </div>
          {rows.slice(0, 10).map((r, i, arr) => (
            <Link
              key={r.apparelId}
              href={`/cards/snkrdunk/${r.apparelId}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line2)' : 'none', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="num" style={{ width: 20, textAlign: 'center', fontSize: 13, fontWeight: 800, color: i < 3 ? 'var(--red)' : 'var(--ink4)' }}>{i + 1}</div>
              <div style={{ width: 34, height: 46, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--surf2)', display: 'grid', placeItems: 'center' }}>
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt={r.shortName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (<span style={{ fontSize: 18 }}>🃏</span>)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.shortName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.localizedName && r.localizedName !== r.shortName
                    ? r.localizedName
                    : `${r.category ?? '카드'}${r.listingCountText ? ` · 매물 ${r.listingCountText}건` : ''}`}
                </div>
              </div>
              <div className="num" style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', flexShrink: 0 }}>{r.minPrice > 0 ? format(r.minPrice) : '—'}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // 캐러셀 — 자동 스크롤 시 카드를 두 벌 이어붙여 끊김 없이 루프.
  const displayRows = autoScroll ? [...rows, ...rows] : rows;
  return (
    <div className="sect">
      <div className="sect-hd">
        <h2>🔥 인기 카드들</h2>
        <Link href="/cards/snkrdunk" className="more">전체 ▶</Link>
      </div>
      {/* 좌/우 padding 으로 첫·마지막 카드의 box-shadow 가 잘리지 않도록 여백 확보. */}
      <div
        ref={scrollRef}
        style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 6px 8px' }}
      >
        {displayRows.map((r, idx) => {
          const bg = r.category ? SNKR_CAT_BG[r.category] : SNKR_FALLBACK_BG;
          const priceText = r.minPrice > 0 ? format(r.minPrice) : '—';
          const showJp = r.localizedName && r.localizedName !== r.shortName;
          return (
            <Panel
              key={`${r.apparelId}-${idx}`}
              href={`/cards/snkrdunk/${r.apparelId}`}
              style={{
                flexShrink: 0, width: 108, cursor: 'pointer', overflow: 'hidden',
                ...(isClean ? {} : { borderTop: `4px solid ${bg}` }),
              }}
            >
              <div style={{
                height: 92, background: 'var(--pap2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt={r.shortName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 33 }}>🃏</span>
                )}
              </div>
              <div style={{
                padding: '7px 8px 9px',
                borderTop: isClean ? '1px solid var(--pap3)' : '3px solid var(--ink)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ minHeight: 16, marginBottom: 5 }}>
                  {r.category ? (
                    <span style={{
                      fontFamily: 'var(--f1)', fontSize: 9, padding: '2px 4px', display: 'inline-block',
                      background: bg, color: 'var(--white)', letterSpacing: 0.3,
                      boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                    }}>{r.category}</span>
                  ) : null}
                </div>
                <div style={{
                  fontFamily: 'var(--f1)', fontSize: 13, letterSpacing: 0.2, marginBottom: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{r.shortName}</div>
                {showJp ? (
                  <div style={{
                    fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
                    letterSpacing: 0.2, marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{r.localizedName}</div>
                ) : null}
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
                  {priceText}
                </div>
                <div style={{
                  fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
                  marginTop: 3, letterSpacing: 0.3, minHeight: 11,
                }}>
                  {r.listingCountText ? `매물 ${r.listingCountText}건` : ''}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}


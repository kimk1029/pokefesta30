'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppBarProfile } from '@/components/AppBarProfile';
import type { HeroSlideData } from '@/components/HeroSlider';
import { HomeKoSearchBar } from '@/components/HomeKoSearchBar';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { findCardEntry, type CardCatalogEntry } from '@/lib/cardsCatalog';
import type { MyCardWithPrice } from '@/lib/queries';

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
const PERIOD_DAYS: Record<'1W' | '1M' | '3M', number> = { '1W': 7, '1M': 30, '3M': 90 };

/**
 * 컬렉션 전체의 일별 종합 가격을 계산.
 * 각 카드의 trend[](최근 N일 평균 시세) 을 합산. trend 가 짧으면 latestPrice 로 채움.
 * 결과는 오래된→최신 순서.
 */
function computeDailyTotals(cards: Array<{ latestPrice: number; trend: number[] }>, days: number): number[] {
  if (days <= 0) return [];
  const out = new Array(days).fill(0);
  for (const c of cards) {
    const t = Array.isArray(c.trend) ? c.trend : [];
    for (let i = 0; i < days; i++) {
      // i=0: 가장 오래된. i=days-1: 가장 최신.
      const tIdxFromEnd = days - 1 - i; // 마지막에서 얼마나 떨어졌는지
      const tIdx = t.length - 1 - tIdxFromEnd;
      out[i] += tIdx >= 0 && tIdx < t.length ? t[tIdx] : c.latestPrice;
    }
  }
  return out;
}
const ACTIVITY = [
  { icon: '🔥', c: 'var(--grn)', txt: '리자몽 EX 가격 ▲ +8%', time: '10분 전', pt: '+5P' },
  { icon: '📷', c: 'var(--blu)', txt: '카이바 슈라이 스캔 완료', time: '1시간 전', pt: '+10P' },
  { icon: '🤝', c: 'var(--gold)', txt: '피카츄 VMAX 거래 완료', time: '3시간 전', pt: '+15P' },
  { icon: '⭐', c: 'var(--pur)', txt: '레벨업! LV.12 달성', time: '어제', pt: '+50P' },
];

interface OwnedDisplay {
  id: number;
  cardId: string | null;
  catalog?: CardCatalogEntry;
  name: string;
  emoji: string;
  game: string;
  rar: Rarity;
  price: number;
  grade: number | null;
}

function rarOf(catalog: CardCatalogEntry | undefined): Rarity {
  if (!catalog) return 'C';
  switch (catalog.grade) {
    case 'S': return 'S';
    case 'A': return 'SR';
    case 'B': return 'R';
    default: return 'C';
  }
}

function parsePsa(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/PSA\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function fmt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Math.round(n).toLocaleString();
}

export function DashboardScreen({ cards, heroBanners, snkrdunkRows = [], packs = [] }: Props) {
  const [chartPeriod, setChartPeriod] = useState<'1W' | '1M' | '3M'>('1M');
  const [activeGame, setActiveGame] = useState<string>('전체');

  const owned: OwnedDisplay[] = cards.map((c) => {
    const catalog = c.cardId ? findCardEntry(c.cardId) : undefined;
    return {
      id: c.id,
      cardId: c.cardId,
      catalog,
      name: c.nickname || catalog?.name || '미식별 카드',
      emoji: catalog?.emoji ?? '🃏',
      game: catalog ? '포켓몬' : '기타',
      rar: rarOf(catalog),
      price: c.latestPrice,
      grade: parsePsa(c.gradeEstimate),
    };
  });

  const graded = owned.filter((c) => c.grade !== null);
  const topCards = [...owned].sort((a, b) => b.price - a.price).slice(0, 3);

  const gamesPresent = Array.from(new Set(owned.map((c) => c.game)));
  const gameDist = gamesPresent.map((g) => ({
    g,
    n: owned.filter((c) => c.game === g).length,
    val: owned.filter((c) => c.game === g).reduce((a, c) => a + c.price, 0),
  }));

  // 컬렉션 일별 종합 가격 (오래된→최신)
  const periodDays = PERIOD_DAYS[chartPeriod];
  const chartData = computeDailyTotals(cards, periodDays);
  const totalVal = chartData[chartData.length - 1] ?? 0;
  const firstVal = chartData[0] ?? totalVal;
  const change = totalVal - firstVal;
  const changePct = firstVal > 0 ? Math.round((change / firstVal) * 100) : 0;
  const maxC = Math.max(...chartData, 1);
  const minC = Math.min(...chartData);

  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />

      {/* ═══ HERO: PORTFOLIO CARD ═══ */}
      <div style={{
        margin: 'var(--gap) var(--gap) var(--cg)',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1B2E89 100%)',
        boxShadow: '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 4px 0 rgba(100,130,255,.18),inset 0 -5px 0 rgba(0,0,0,.55),9px 9px 0 var(--ink)',
        padding: '18px 16px 16px', position: 'relative', overflow: 'hidden',
      }}>
        {/* scanlines */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.07) 3px 4px)', pointerEvents: 'none' }} />
        {/* corner brackets */}
        <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
        <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />
        <div style={{ position: 'absolute', bottom: 6, left: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
        <div style={{ position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />

        {/* Label + value */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: 2, marginBottom: 8 }}>
            TOTAL PORTFOLIO
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'var(--f1)', fontSize: 28, color: 'var(--gold)', letterSpacing: -2,
              textShadow: '0 0 24px rgba(255,210,63,.35),4px 4px 0 rgba(0,0,0,.5)', lineHeight: 1,
            }}>
              ₩{fmt(totalVal)}
            </div>
            <div style={{ paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderBottom: changePct >= 0 ? '8px solid #22C55E' : '8px solid transparent',
                  borderTop: changePct >= 0 ? 'none' : '8px solid #E63946',
                }} />
                <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: changePct >= 0 ? '#22C55E' : '#E63946', letterSpacing: .5 }}>
                  {changePct >= 0 ? '+' : ''}{changePct}%
                </span>
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>
                vs 지난주
              </div>
            </div>
          </div>
        </div>

        {/* Chart area — 컬렉션 일별 종합 가격 꺾은선 */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <PortfolioLineChart
            data={chartData}
            width={300}
            height={64}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.25)', letterSpacing: .3 }}>
              {chartPeriod === '1W' ? '7일' : chartPeriod === '1M' ? '30일' : '90일'} 전
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['1W', '1M', '3M'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChartPeriod(p)}
                  style={{
                    padding: '3px 9px', fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: .5, cursor: 'pointer',
                    background: chartPeriod === p ? 'var(--gold)' : 'rgba(255,255,255,.06)',
                    color: chartPeriod === p ? 'var(--ink)' : 'rgba(255,255,255,.35)',
                    boxShadow: chartPeriod === p
                      ? '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)'
                      : '0 0 0 1px rgba(255,255,255,.12)',
                    border: 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
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
              <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: c, letterSpacing: .3, marginBottom: 5 }}>{v}</div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ QUICK ACTIONS — 포트폴리오 바로 아래 ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>바로가기</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { icon: '📷', lb: '스캔', bg: 'var(--grn)', href: '/cards/grading' },
            { icon: '¥', lb: '가격탐색', bg: 'var(--gold)', href: '/cards/packs' },
            { icon: '🏷', lb: '마켓', bg: 'var(--orn)', href: '/feed' },
            { icon: '📦', lb: '컬렉션', bg: 'var(--blu)', href: '/my/cards' },
          ].map(({ icon, lb, bg, href }) => (
            <Link key={lb} href={href} className="dash-quick">
              <div style={{
                width: 42, height: 42, background: bg, display: 'grid', placeItems: 'center', fontSize: 20,
                boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.3),inset 0 -2px 0 rgba(0,0,0,.25),3px 3px 0 var(--ink)',
              }}>
                {icon}
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: .3 }}>{lb}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ SEARCH (KR → JP → snkrdunk) ═══ */}
      <HomeKoSearchBar />

      {/* ═══ XP / LEVEL BAR ═══ */}
      <div style={{
        margin: '0 var(--gap) var(--cg)', background: 'var(--white)', padding: '13px 14px',
        boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(0,0,0,.12),5px 5px 0 var(--ink)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, background: 'var(--pur)', display: 'grid', placeItems: 'center', fontSize: 16,
              boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 3px 0 var(--pur-lt),inset 0 -2px 0 var(--pur-dk),3px 3px 0 var(--ink)',
            }}>🏆</div>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: .5 }}>{LEVEL_LABEL}</div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 4, letterSpacing: .3 }}>다음 레벨까지 {XP_MAX - XP_CURRENT}P</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 13, color: 'var(--gold-dk)', letterSpacing: .5 }}>🪙{POINTS.toLocaleString()}</div>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 3, letterSpacing: .3 }}>포인트</div>
          </div>
        </div>
        <div style={{
          background: 'var(--bg3)', height: 12, position: 'relative',
          boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 2px 2px 0 rgba(0,0,0,.15)',
        }}>
          <div style={{
            width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`, height: '100%',
            background: 'linear-gradient(90deg,var(--pur-dk),var(--pur),var(--gold))',
            boxShadow: 'inset 0 3px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.2)', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: 'var(--white)', opacity: .9,
              animation: 'xp-shine 1.5s steps(2) infinite',
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: .3 }}>{XP_CURRENT} / {XP_MAX} XP</span>
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--pur)', letterSpacing: .3 }}>+{XP_WEEK}XP 이번 주</span>
        </div>
      </div>

      {/* ═══ 2×2 KEY METRICS ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>핵심 지표</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Block label="컬렉션 가치" value={`₩${fmt(totalVal)}`} sub={`▲ +${changePct}% 지난주`} color="var(--gold-dk)" icon="💰" />
          <Block label="그레이딩률" value={`${owned.length > 0 ? Math.round((graded.length / owned.length) * 100) : 0}%`} sub={`${graded.length} / ${owned.length}장`} color="var(--pur)" icon="🏆" />
          <Block label="최고가 카드" value={`₩${fmt(topCards[0]?.price || 0)}`} sub={topCards[0]?.name} color="var(--grn-dk)" icon="🎯" />
          <Block label="이번주 거래" value={`${TRADES_THIS_WEEK}건`} sub="+45P 포인트 획득" color="var(--blu)" icon="🤝" href="/feed" />
        </div>
      </div>

      {/* ═══ GAME DISTRIBUTION ═══ */}
      {gameDist.length > 0 && (
        <div className="sect">
          <div className="sect-hd"><h2>게임별 현황</h2></div>
          {/* Game selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10, paddingBottom: 2 }}>
            {['전체', ...gameDist.map((x) => x.g)].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGame(g)}
                style={{
                  flexShrink: 0, fontFamily: 'var(--f1)', fontSize: 9, padding: '6px 11px', cursor: 'pointer',
                  background: activeGame === g ? 'var(--ink)' : (g !== '전체' ? GAME_COLORS[g] || 'var(--white)' : 'var(--white)'),
                  color: activeGame === g ? 'var(--gold)' : (g !== '전체' ? 'var(--white)' : 'var(--ink)'),
                  boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                  border: 'none', letterSpacing: .3,
                }}
              >
                {g === '전체' ? 'ALL' : g}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(activeGame === '전체' ? gameDist : gameDist.filter((x) => x.g === activeGame)).map(({ g, n, val }) => {
              const pct = owned.length > 0 ? Math.round((n / owned.length) * 100) : 0;
              const gGraded = owned.filter((c) => c.game === g && c.grade !== null).length;
              return (
                <div key={g} style={{
                  background: 'var(--white)', padding: '12px 12px',
                  boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(0,0,0,.14),4px 4px 0 var(--ink)',
                  borderTop: `4px solid ${GAME_COLORS[g] || 'var(--ink)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: .3 }}>{g}</div>
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', letterSpacing: .3 }}>{pct}%</div>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 20, letterSpacing: -1, color: 'var(--ink)', marginBottom: 4 }}>
                    {n}<span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 4 }}>장</span>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--grn-dk)', letterSpacing: .3, marginBottom: 8 }}>₩{fmt(val)}</div>
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
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--gold-dk)', marginTop: 6, letterSpacing: .3 }}>
                      🏆 그레이딩 {gGraded}건
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SNKRDUNK JP PRICES ═══ */}
      {snkrdunkRows.length > 0 && (
        <div className="sect">
          <div className="sect-hd">
            <h2>🔥 인기 카드들</h2>
            <Link href="/cards/snkrdunk" className="more">전체 ▶</Link>
          </div>
          {/* 좌/우 padding 으로 첫·마지막 카드의 box-shadow 가 잘리지 않도록 여백 확보. */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 6px 8px' }}>
            {snkrdunkRows.map((r) => {
              const bg = r.category ? SNKR_CAT_BG[r.category] : SNKR_FALLBACK_BG;
              const priceText = r.minPrice > 0 ? `¥${r.minPrice.toLocaleString('ja-JP')}` : '—';
              const showJp = r.localizedName && r.localizedName !== r.shortName;
              return (
                <Link
                  key={r.apparelId}
                  href={`/cards/snkrdunk/${r.apparelId}`}
                  style={{
                    flexShrink: 0, width: 108, cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                    background: 'var(--white)',
                    boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.7),5px 5px 0 var(--ink)',
                    borderTop: `4px solid ${bg}`,
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
                      <span style={{ fontSize: 32 }}>🃏</span>
                    )}
                  </div>
                  <div style={{
                    padding: '7px 8px 9px', borderTop: '3px solid var(--ink)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ minHeight: 16, marginBottom: 5 }}>
                      {r.category ? (
                        <span style={{
                          fontFamily: 'var(--f1)', fontSize: 8, padding: '2px 4px', display: 'inline-block',
                          background: bg, color: 'var(--white)', letterSpacing: 0.3,
                          boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                        }}>{r.category}</span>
                      ) : null}
                    </div>
                    <div style={{
                      fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 0.2, marginBottom: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.shortName}</div>
                    {showJp ? (
                      <div style={{
                        fontFamily: 'var(--f1)', fontSize: 7, color: 'var(--ink3)',
                        letterSpacing: 0.2, marginBottom: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{r.localizedName}</div>
                    ) : null}
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--red)', letterSpacing: 0.3 }}>
                      {priceText}
                    </div>
                    <div style={{
                      fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)',
                      marginTop: 3, letterSpacing: 0.3, minHeight: 11,
                    }}>
                      {r.listingCountText ? `매물 ${r.listingCountText}건` : ''}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ACTIVITY LOG ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>최근 활동</h2></div>
        <div style={{
          background: 'var(--white)', padding: '14px 14px 6px',
          boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(0,0,0,.12),5px 5px 0 var(--ink)',
        }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < ACTIVITY.length - 1 ? '2px solid var(--bg3)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, background: a.c, display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0,
                boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.3),3px 3px 0 var(--ink)',
              }}>
                {a.icon}
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: .3, lineHeight: 1.5 }}>{a.txt}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--gold-dk)', letterSpacing: .3 }}>{a.pt}</div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: .3 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
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
      {icon && <div style={{ position: 'absolute', right: 10, top: 10, fontSize: 18, opacity: .15 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: .5 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--f1)', fontSize: 20, color: color || 'var(--ink)', letterSpacing: -1, lineHeight: 1,
        textShadow: color ? '1px 1px 0 rgba(0,0,0,.15)' : 'none',
      }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: .3 }}>{sub}</div>}
    </>
  );
  const baseStyle: React.CSSProperties = {
    background: 'var(--white)', padding: '14px 12px',
    boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),inset 0 -4px 0 rgba(0,0,0,.14),5px 5px 0 var(--ink)',
    display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', overflow: 'hidden',
    textDecoration: 'none', color: 'inherit',
  };
  if (href) {
    return <Link href={href} style={baseStyle}>{inner}</Link>;
  }
  return <div style={baseStyle}>{inner}</div>;
}

function PackHitsSectionBlock({ pack }: { pack: PackRow }) {
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
        <span style={{ fontSize: 18 }}>{pack.emoji}</span>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.5, flex: 1 }}>{pack.shortName}</span>
        {pack.releasedAt ? (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 8, opacity: 0.8, letterSpacing: 0.3 }}>
            {pack.releasedAt.slice(0, 7).replace('-', '.')}
          </span>
        ) : null}
        <Link
          href={`/cards/packs/${pack.code}`}
          style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--white)', letterSpacing: 0.3, textDecoration: 'underline' }}
        >
          전체 ▶
        </Link>
      </div>
      {pack.hits.length === 0 ? (
        <div
          style={{
            padding: 24, textAlign: 'center', background: 'var(--white)',
            fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
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
                  <span style={{ fontSize: 32 }}>🃏</span>
                )}
              </div>
              <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 0.2, marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {hit.shortName}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--red)', letterSpacing: 0.3 }}>
                  {hit.minPrice > 0 ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '—'}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 3, letterSpacing: 0.3, minHeight: 11 }}>
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
 * 포트폴리오 일별 종합 가격 꺾은선 차트.
 * data: 오래된→최신 순. 점은 첫/마지막/최고/최저만 표시.
 */
function PortfolioLineChart({
  data,
  width = 300,
  height = 64,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        style={{
          width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: 0.3,
          borderBottom: '1px solid rgba(255,255,255,.1)',
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
  const stroke = trendUp ? 'var(--gold)' : '#E63946';
  const fill = trendUp ? 'rgba(255,210,63,0.22)' : 'rgba(230,57,70,0.18)';

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', borderBottom: '1px solid rgba(255,255,255,.1)' }}
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
      <circle cx={lastX} cy={lastY} r={3.2} fill={stroke} stroke="var(--ink)" strokeWidth={1} />
    </svg>
  );
}

import Link from 'next/link';
import { AppBarProfile } from '@/components/AppBarProfile';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { findCardEntry } from '@/lib/cardsCatalog';
import type { MyCardWithPrice } from '@/lib/queries';
import {
  build12wSeries,
  summarize,
  type CardWithPrice,
} from './PortfolioStats';

interface Props {
  cards: MyCardWithPrice[];
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
}

const GAME_COLORS: Record<string, string> = {
  포켓몬: '#E63946',
  유희왕: '#7C3AED',
  원피스: '#F97316',
  MTG: '#22C55E',
  스포츠: '#3A5BD9',
  기타: '#94A3B8',
};

export function DashboardScreen({ cards, heroBanners, isLoggedIn }: Props) {
  // UserCardWithPrice → 디스플레이용 모델
  const display: CardWithPrice[] = cards.map((c) => ({
    id: c.id,
    cardId: c.cardId,
    catalog: c.cardId ? findCardEntry(c.cardId) : undefined,
    nickname: c.nickname,
    gradeEstimate: c.gradeEstimate,
    price: c.latestPrice,
    trend: c.trend,
  }));
  const stats = summarize(display);
  const series = build12wSeries(stats.totalVal, stats.deltaPct);
  const topCard = stats.topCard;
  const recent = display.slice(0, 6); // cards 는 서버에서 createdAt desc 정렬

  // 게임별 분포 — 카탈로그가 없는 카드는 "기타" 로
  const distMap = new Map<string, number>();
  for (const c of display) {
    const game = c.catalog ? gameOf(c.catalog) : '기타';
    distMap.set(game, (distMap.get(game) ?? 0) + 1);
  }
  const dist = Array.from(distMap.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarProfile />} />

      {!isLoggedIn ? (
        <GuestHero />
      ) : (
        <div className="cv-port">
          <div className="cv-port-lbl">내 포트폴리오 총 가치</div>
          <div className="cv-port-val">${fmtUsd(stats.totalVal)}</div>
          <div className="cv-port-sub">
            <span className={`cv-port-delta ${stats.weekDelta >= 0 ? 'up' : 'dn'}`}>
              {stats.weekDelta >= 0 ? '▲' : '▼'} ${fmtUsd(Math.abs(stats.weekDelta))} ({stats.deltaPct}%)
            </span>
            <span className="cv-port-since">지난 주 대비</span>
          </div>
          <PortfolioLineChart series={series} />
          <div className="cv-mini-axis">
            <span>12주 전</span>
            <span>6주 전</span>
            <span>이번 주</span>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="cv-stat-row">
          <Stat n={stats.cardCount} l="보유 카드" />
          <Stat n={stats.gradedCount} l="그레이딩" gold />
          <Stat n={`${stats.gradedPct}%`} l="그레이딩률" />
        </div>
      )}

      {dist.length > 0 && (
        <div className="cv-sect">
          <div className="cv-sect-hd">
            <h2>게임별 분포</h2>
          </div>
          <div className="cv-dist">
            {dist.map(([g, n]) => {
              const pct = Math.round((n / display.length) * 100);
              return (
                <div key={g} className="cv-dist-row">
                  <div className="cv-dist-top">
                    <span className="cv-dist-name">{g}</span>
                    <span className="cv-dist-pct">
                      {n}장 {pct}%
                    </span>
                  </div>
                  <div className="cv-dist-track">
                    <div
                      className="cv-dist-fill"
                      style={{ width: `${pct}%`, background: GAME_COLORS[g] ?? 'var(--ink)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topCard && (
        <div className="cv-sect">
          <div className="cv-sect-hd">
            <h2>최고가 카드</h2>
            <Link href="/my/cards" className="cv-more">
              컬렉션 ▶
            </Link>
          </div>
          <Link
            href={topCard.cardId ? `/cards/search?id=${encodeURIComponent(topCard.cardId)}` : '/my/cards'}
            className="cv-list-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              className="cv-list-thumb cv-card-img"
              style={{
                background: topCard.catalog
                  ? `linear-gradient(160deg,${GAME_COLORS[gameOf(topCard.catalog)] ?? '#1E293B'}33,var(--ink2))`
                  : 'var(--ink2)',
              }}
            >
              <div className="cv-card-em">{topCard.catalog?.emoji ?? '🃏'}</div>
            </div>
            <div className="cv-lc-body">
              <div className="cv-lc-title">{topCard.nickname || topCard.catalog?.name || '내 카드'}</div>
              <div className="cv-lc-sub">{topCard.gradeEstimate ?? '미그레이딩'}</div>
              <div className="cv-lc-row">
                {topCard.catalog && <span className={`cv-rar cv-rar-${topCard.catalog.grade}`}>{topCard.catalog.grade}</span>}
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--grn-dk)', marginTop: 6, letterSpacing: 0.5 }}>
                ${fmtUsd(topCard.price)}
              </div>
            </div>
          </Link>
        </div>
      )}

      {isLoggedIn && recent.length > 0 && (
        <div className="cv-sect">
          <div className="cv-sect-hd">
            <h2>최근 아카이빙</h2>
            <Link href="/my/cards" className="cv-more">
              전체 보기 ▶
            </Link>
          </div>
          <div className="cv-recent-row">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={c.cardId ? `/cards/search?id=${encodeURIComponent(c.cardId)}` : '/my/cards'}
                className="cv-recent-tile"
              >
                <div
                  className="cv-recent-thumb"
                  style={{
                    background: c.catalog
                      ? `linear-gradient(160deg,${GAME_COLORS[gameOf(c.catalog)] ?? '#1E293B'}33,var(--ink2))`
                      : 'var(--ink2)',
                  }}
                >
                  {c.catalog?.emoji ?? '🃏'}
                </div>
                <div className="cv-recent-name" title={c.nickname || c.catalog?.name || '내 카드'}>
                  {c.nickname || c.catalog?.name || '내 카드'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="cv-sect">
        <div className="cv-sect-hd">
          <h2>빠른 메뉴</h2>
        </div>
        <div className="cv-quick">
          <QuickBtn href="/cards/add" emoji="＋" label="카드 추가하기" bg="var(--gold)" />
          <QuickBtn href="/my/cards" emoji="📚" label="내 컬렉션" bg="var(--grn)" />
          <QuickBtn href="/cards" emoji="📊" label="시세 확인" bg="var(--blu)" />
          <QuickBtn href="/trade" emoji="🤝" label="마켓 보기" bg="var(--orn)" />
        </div>
      </div>

      {heroBanners && heroBanners.length > 0 && (
        <HeroSlider slides={heroBanners} />
      )}

      <div className="bggap" />
    </>
  );
}

function Stat({ n, l, gold }: { n: number | string; l: string; gold?: boolean }) {
  return (
    <div className="cv-stat-card">
      <div className={`cv-stat-n${gold ? ' gold' : ''}`}>{n}</div>
      <div className="cv-stat-l">{l}</div>
    </div>
  );
}

function QuickBtn({
  href,
  emoji,
  label,
  bg,
}: {
  href: string;
  emoji: string;
  label: string;
  bg: string;
}) {
  return (
    <Link href={href} className="cv-quick-btn">
      <div className="cv-quick-icon" style={{ background: bg }}>
        {emoji}
      </div>
      <div className="cv-quick-lbl">{label}</div>
    </Link>
  );
}

function GuestHero() {
  return (
    <div className="cv-port">
      <div className="cv-port-lbl">CardVault — 내 카드를 가장 스마트하게</div>
      <div className="cv-port-val" style={{ fontSize: 18 }}>
        🃏 스캔 · 아카이빙
      </div>
      <div className="cv-port-sub">
        <span className="cv-port-since">로그인하면 포트폴리오 가치를 추적할 수 있어요</span>
      </div>
      <Link
        href="/login?callbackUrl=%2F"
        style={{
          display: 'inline-block',
          marginTop: 14,
          padding: '10px 14px',
          background: 'var(--gold)',
          color: 'var(--ink)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          letterSpacing: 1,
          textDecoration: 'none',
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 var(--gold-lt),inset 0 -2px 0 var(--gold-dk),4px 4px 0 var(--ink)',
        }}
      >
        ▶ 로그인하기
      </Link>
    </div>
  );
}

function fmtUsd(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * 12주 시세 시퀀스를 SVG 꺾은선으로 그린다.
 * series 는 0..100 범위 정규화된 값. width/height 는 viewBox 좌표계.
 */
function PortfolioLineChart({ series }: { series: number[] }) {
  const W = 100;
  const H = 36;
  const PAD_X = 2;
  const PAD_Y = 3;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const n = series.length;
  if (n < 2) return <div style={{ height: H }} />;

  const points = series.map((v, i) => {
    const x = PAD_X + (i / (n - 1)) * innerW;
    const y = PAD_Y + (1 - v / 100) * innerH;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${points[n - 1][0].toFixed(2)} ${(H - PAD_Y).toFixed(2)} L${points[0][0].toFixed(2)} ${(H - PAD_Y).toFixed(2)} Z`;
  const last = points[n - 1];

  return (
    <svg
      className="cv-mini-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} fill="rgba(255,210,63,.18)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {points.map(([x, y], i) => (
        <rect
          key={i}
          x={x - 0.7}
          y={y - 0.7}
          width="1.4"
          height="1.4"
          fill={i === n - 1 ? 'var(--gold)' : 'rgba(255,210,63,.6)'}
        />
      ))}
      <rect x={last[0] - 1.4} y={last[1] - 1.4} width="2.8" height="2.8" fill="var(--gold)" stroke="var(--ink)" strokeWidth="0.6" />
    </svg>
  );
}

/**
 * 카탈로그 grade(S/A/B/C) 는 게임 분류가 아님.
 * 우리 데이터엔 game 정보가 없으므로 일단 '포켓몬' 으로 통일 (현재 카탈로그 전부 포켓몬 카드).
 * 추후 CardCatalogEntry 에 game 필드 추가하면 그걸 반환.
 */
function gameOf(_entry: { id: string; grade: string }): string {
  return '포켓몬';
}

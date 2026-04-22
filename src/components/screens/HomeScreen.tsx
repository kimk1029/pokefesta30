import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { CongBadge } from '@/components/CongBadge';
import { PixelKarp } from '@/components/PixelKarp';
import { StatusBar } from '@/components/StatusBar';
import type { Place, Trade } from '@/lib/types';

const CHART_DATA = [
  { h: 3,  lv: 'empty' },
  { h: 4,  lv: 'empty' },
  { h: 8,  lv: 'normal' },
  { h: 12, lv: 'normal' },
  { h: 18, lv: 'busy' },
  { h: 24, lv: 'busy' },
  { h: 32, lv: 'full' },
  { h: 40, lv: 'full' },
  { h: 28, lv: 'busy' },
  { h: 22, lv: 'busy' },
  { h: 30, lv: 'full' },
  { h: 38, lv: 'full', now: true },
  { h: 0,  lv: 'empty', future: true },
  { h: 0,  lv: 'empty', future: true },
] as const;

interface Props {
  places: Place[];
  trades: Trade[];
  todayCount: number;
}

export function HomeScreen({ places, trades, todayCount }: Props) {
  const today = new Date();
  const dateLabel = `${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const quietPlaces = places.filter((p) => p.level === 'empty' || p.level === 'normal').slice(0, 3);
  const recentTrades = trades.slice(0, 3);

  return (
    <>
      <StatusBar />
      <AppHeader />

      <div className="hero">
        <span className="hero-badge">▶ 실시간 · {dateLabel}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h1>잉어킹<br />프로모!</h1>
            <p style={{ marginTop: 8 }}>지금 어디가<br />덜 붐비는지 확인</p>
          </div>
          <PixelKarp size={110} />
        </div>
        <div className="hero-visual">
          <div className="label">★ MEGAFESTA ★<br />MAIN VISUAL</div>
        </div>
      </div>

      <div className="quick-grid">
        <Link href="/live" className="quick-item">
          <div className="quick-emoji r">📍</div>
          <span>현황</span>
        </Link>
        <Link href="/trade" className="quick-item">
          <div className="quick-emoji b">💬</div>
          <span>거래</span>
        </Link>
        <Link href="/report" className="quick-item">
          <div className="quick-emoji y">📢</div>
          <span>제보</span>
        </Link>
        <Link href="/map" className="quick-item">
          <div className="quick-emoji g">🗺</div>
          <span>지도</span>
        </Link>
      </div>

      <div className="section">
        <div className="section-title">
          <h2>시간대별 제보량</h2>
          <span className="more">오늘 {todayCount}건</span>
        </div>
        <div className="summary-card">
          <div className="summary-top">
            <div>
              <div className="label">지금 제보 속도</div>
              <div className="big">분당 3.2건</div>
            </div>
            <span className="congestion-badge cb-busy">혼잡</span>
          </div>
          <div className="feed-chart">
            {CHART_DATA.map((d, i) => {
              const future = 'future' in d && d.future;
              const now = 'now' in d && d.now;
              return (
                <div key={i} className={`fc-col ${future ? 'future' : ''}`}>
                  <div className="fc-count">{future ? '' : d.h}</div>
                  <div
                    className={`fc-bar fc-${d.lv} ${now ? 'now' : ''}`}
                    style={{ height: future ? '4px' : `${Math.max(8, d.h * 2.4)}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="time-labels">
            <span>10시</span><span>12시</span><span>14시</span><span>지금</span><span>18시</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <h2>덜 붐비는 곳</h2>
          <Link href="/live" className="more">전체 ▶</Link>
        </div>
        {quietPlaces.length === 0 ? (
          <div className="place-card"><div className="place-main"><div className="place-meta">아직 제보가 없어요</div></div></div>
        ) : quietPlaces.map((p) => (
          <div key={p.id} className="place-card">
            <div className="place-icon" style={{ background: p.bg }}>{p.emoji}</div>
            <div className="place-main">
              <div className="place-name">{p.name}</div>
              <div className="place-meta">
                <span className={p.mins <= 5 ? 'fresh' : p.mins > 15 ? 'stale' : ''}>
                  {p.mins <= 1 ? '방금 전' : `${p.mins}분 전`}
                </span>
                {' · '}제보 {p.count}
              </div>
            </div>
            <CongBadge level={p.level} />
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-title">
          <h2>최근 거래글</h2>
          <Link href="/trade" className="more">전체 ▶</Link>
        </div>
        {recentTrades.length === 0 ? (
          <div className="trade-card"><div className="trade-title">아직 거래글이 없어요</div></div>
        ) : recentTrades.map((t) => (
          <div key={t.id} className="trade-card">
            <div className="trade-top">
              <span className={`tag ${t.type === 'buy' ? 'tag-buy' : 'tag-sell'}`}>
                {t.type === 'buy' ? '삽니다' : '팝니다'}
              </span>
              <span className="tag tag-place">📍 {t.place}</span>
            </div>
            <div className="trade-title">{t.title}</div>
            <div className="trade-meta">
              <span>{t.time}</span>
              <span className="dot-sep">·</span>
              <span className="price">{t.price}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
    </>
  );
}

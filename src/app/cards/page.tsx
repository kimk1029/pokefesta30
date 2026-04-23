import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';

export const dynamic = 'force-dynamic';

type Trend = 'up' | 'down' | 'flat';

interface CardPrice {
  id: string;
  name: string;
  emoji: string;
  grade: 'S' | 'A' | 'B' | 'C';
  low: number;
  avg: number;
  high: number;
  trend: Trend;
  delta: number; // percent
  volume: number;
}

const CARDS: CardPrice[] = [
  { id: 'karp-holo', name: '잉어킹 홀로 프레임',  emoji: '🖼', grade: 'S', low: 35000, avg: 55000, high: 80000, trend: 'up',   delta: 12.4, volume: 28 },
  { id: 'rainbow',   name: '레인보우 프레임',       emoji: '🌈', grade: 'A', low: 12000, avg: 18000, high: 25000, trend: 'up',   delta: 4.7,  volume: 41 },
  { id: 'prem-badge',name: '프리미엄 뱃지',         emoji: '🏅', grade: 'A', low: 7000,  avg: 11000, high: 15000, trend: 'flat', delta: 0.3,  volume: 63 },
  { id: 'gold-badge',name: '황금 배지',             emoji: '🥇', grade: 'B', low: 3500,  avg: 5200,  high: 7000,  trend: 'up',   delta: 2.1,  volume: 102 },
  { id: 'ball-skin', name: '몬스터볼 스킨',         emoji: '⚪', grade: 'B', low: 2500,  avg: 3800,  high: 5500,  trend: 'down', delta: -5.2, volume: 138 },
  { id: 'push-x3',   name: '푸시 알림권 x3',         emoji: '📣', grade: 'C', low: 500,   avg: 700,   high: 950,   trend: 'flat', delta: -0.1, volume: 211 },
  { id: 'sticker',   name: '스티커 팩',             emoji: '🌟', grade: 'C', low: 150,   avg: 280,   high: 400,   trend: 'down', delta: -8.4, volume: 340 },
  { id: 'karp-promo',name: '잉어킹 프로모 코드',    emoji: '🎫', grade: 'S', low: 13000, avg: 16500, high: 22000, trend: 'up',   delta: 6.9,  volume: 79 },
];

const GRADE_BG: Record<CardPrice['grade'], string> = {
  S: 'var(--pur)', A: 'var(--blu)', B: 'var(--tel)', C: 'var(--grn-dk)',
};
const TREND_COLOR: Record<Trend, string> = {
  up: 'var(--red)', down: 'var(--blu)', flat: 'var(--ink3)',
};
const TREND_ICON: Record<Trend, string> = { up: '▲', down: '▼', flat: '―' };

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export default function Page() {
  const totalVolume = CARDS.reduce((s, c) => s + c.volume, 0);
  return (
    <>
      <StatusBar />
      <AppBar title="카드 시세" showBack backHref="/" />

      <div style={{ height: 14 }} />

      {/* 요약 헤더 */}
      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,var(--ink),var(--ink2))',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 var(--ink2),8px 8px 0 var(--yel-dk)',
        }}
      >
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 1, color: 'var(--yel)' }}>
            실시간 시세
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 0.3, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.6 }}>
            오늘 거래량 {fmt(totalVolume)}건 · 최근 24시간 체결 기준<br />
            가격은 포인트(P) 단위 · 참고용 데이터입니다
          </div>
        </div>
      </div>

      {/* 시세 리스트 */}
      <div className="sect">
        <SectionTitle title="카드별 시세" right={<span className="more">{CARDS.length}종</span>} />
        {CARDS.map((c) => (
          <div
            key={c.id}
            className="shop-card"
            style={{ cursor: 'default' }}
          >
            <div className="sh-icon" style={{ background: GRADE_BG[c.grade], color: 'var(--white)' }}>
              {c.emoji}
            </div>
            <div className="sh-main">
              <div
                className="sh-title"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
                    padding: '2px 5px',
                    background: GRADE_BG[c.grade],
                    color: 'var(--white)',
                    letterSpacing: 0.5,
                    boxShadow:
                      '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                  }}
                >
                  {c.grade}
                </span>
                {c.name}
              </div>
              <div className="sh-desc" style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 6 }}>
                {fmt(c.low)} ~ {fmt(c.high)} · 오늘 {c.volume}건
              </div>
            </div>
            <div className="sh-right">
              <span className="sh-price" style={{ color: TREND_COLOR[c.trend] }}>
                🪙 {fmt(c.avg)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: TREND_COLOR[c.trend],
                  letterSpacing: 0.3,
                }}
              >
                {TREND_ICON[c.trend]} {c.delta >= 0 ? '+' : ''}{c.delta.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          margin: '8px var(--gap) 0',
          padding: '10px 12px',
          background: 'var(--pap2)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink2)',
          lineHeight: 1.8,
          letterSpacing: 0.3,
          textAlign: 'center',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        💡 구매 희망가를 참고하려면{' '}
        <Link href="/trade" style={{ color: 'var(--red)', textDecoration: 'underline' }}>
          거래 게시판 ▶
        </Link>
      </div>

      <div className="bggap" />
    </>
  );
}

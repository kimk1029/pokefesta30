import { LivePill } from './ui/LivePill';

type BarLevel = 'e' | 'n' | 'b' | 'f';

interface Bar {
  h: number;        // 표시 높이에 쓰이는 카운트 값
  lv: BarLevel;
  now?: boolean;
  fut?: boolean;
}

interface Props {
  /** 24개 시간대별 제보 건수 (index = 시간). 없으면 0 */
  counts?: number[];
  /** 현재 시 (0-23) */
  nowHour?: number;
  /** 상단 요약 — 미지정 시 최근 시간 건수 / 60 으로 자동 계산 */
  rate?: string;
}

function levelOf(c: number): BarLevel {
  if (c <= 0) return 'e';
  if (c <= 3) return 'n';
  if (c <= 8) return 'b';
  return 'f';
}

function hourLabel(h: number): string {
  return `${(h + 24) % 24}시`;
}

export function FeedChart({ counts, nowHour, rate }: Props) {
  const safeCounts = counts && counts.length === 24 ? counts : new Array<number>(24).fill(0);
  const now = typeof nowHour === 'number' ? ((nowHour % 24) + 24) % 24 : new Date().getHours();

  // 11시간 전 ~ 현재 ~ +2시간 = 14 bar
  const bars: Bar[] = [];
  for (let offset = -11; offset <= 2; offset++) {
    const hour = (now + offset + 24) % 24;
    const c = safeCounts[hour] ?? 0;
    bars.push({
      h: c,
      lv: levelOf(c),
      now: offset === 0,
      fut: offset > 0,
    });
  }

  const autoRate = rate ?? (() => {
    const lastHourCount = safeCounts[now] ?? 0;
    const perMin = (lastHourCount / 60).toFixed(1);
    return `분당 ${perMin}건`;
  })();

  const totalToday = safeCounts.reduce((s, n) => s + n, 0);

  return (
    <div className="sum-card">
      <div className="sum-top">
        <div>
          <div className="sum-lbl">지금 제보 속도</div>
          <div className="sum-big">{autoRate}</div>
        </div>
        <LivePill />
      </div>
      <div className="feed-chart">
        {bars.map((d, i) => (
          <div key={i} className={`fc-col ${d.fut ? 'fc-future' : ''}`}>
            <div className="fc-num">{d.fut ? '' : d.h}</div>
            <div
              className={`fc-bar ${d.lv} ${d.now ? 'now' : ''}`}
              style={{ height: d.fut ? '4px' : `${Math.max(6, Math.min(80, d.h * 6))}px` }}
            />
          </div>
        ))}
      </div>
      <div className="time-labels">
        <span>{hourLabel(now - 8)}</span>
        <span>{hourLabel(now - 4)}</span>
        <span>{hourLabel(now - 2)}</span>
        <span>지금</span>
        <span>{hourLabel(now + 2)}</span>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.3, textAlign: 'right' }}>
        오늘 총 {totalToday}건
      </div>
    </div>
  );
}

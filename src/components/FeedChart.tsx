import { LivePill } from './ui/LivePill';

type BarLevel = 'e' | 'n' | 'b' | 'f';

interface Bar {
  h: number;
  lv: BarLevel;
  now?: boolean;
  fut?: boolean;
}

const CHART: Bar[] = [
  { h: 3, lv: 'e' },
  { h: 4, lv: 'e' },
  { h: 8, lv: 'n' },
  { h: 12, lv: 'n' },
  { h: 18, lv: 'b' },
  { h: 24, lv: 'b' },
  { h: 32, lv: 'f' },
  { h: 40, lv: 'f' },
  { h: 28, lv: 'b' },
  { h: 22, lv: 'b' },
  { h: 30, lv: 'f' },
  { h: 38, lv: 'f', now: true },
  { h: 0, lv: 'e', fut: true },
  { h: 0, lv: 'e', fut: true },
];

export function FeedChart({ rate = '분당 3.2건' }: { rate?: string }) {
  return (
    <div className="sum-card">
      <div className="sum-top">
        <div>
          <div className="sum-lbl">지금 제보 속도</div>
          <div className="sum-big">{rate}</div>
        </div>
        <LivePill />
      </div>
      <div className="feed-chart">
        {CHART.map((d, i) => (
          <div key={i} className={`fc-col ${d.fut ? 'fc-future' : ''}`}>
            <div className="fc-num">{d.fut ? '' : d.h}</div>
            <div
              className={`fc-bar ${d.lv} ${d.now ? 'now' : ''}`}
              style={{ height: d.fut ? '4px' : `${Math.max(6, d.h * 2)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="time-labels">
        <span>10시</span>
        <span>12시</span>
        <span>14시</span>
        <span>지금</span>
        <span>18시</span>
      </div>
    </div>
  );
}

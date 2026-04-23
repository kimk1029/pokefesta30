import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MY_PROFILE, ORIPA_BOXES, ORIPA_RESULTS } from '@/lib/data';

export function OripaScreen() {
  return (
    <>
      <StatusBar />
      <AppBar
        title="오리파"
        showBack
        right={<LivePill label={`${MY_PROFILE.points.toLocaleString()}P`} />}
      />

      <div style={{ height: 14 }} />

      <div className="sect">
        <SectionTitle title="박스 고르기" right={<span className="more">확률공개</span>} />
        {ORIPA_BOXES.map((b) => (
          <div key={b.id} className={`oripa-box ${b.tier}`}>
            <div className="ob-top">
              <div className="ob-icon">{b.emoji}</div>
              <div className="ob-meta">
                <div className="ob-name">{b.name}</div>
                <div className="ob-desc">{b.desc}</div>
              </div>
            </div>
            <div className="ob-odds">{b.odds}</div>
            <div className="ob-bottom">
              <span className="ob-price">💎 {b.price.toLocaleString()}P</span>
              <button type="button" className="ob-draw">
                ▶ 뽑기 ▶
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sect">
        <SectionTitle title="최근 뽑힌 결과" right={<LivePill />} />
        {ORIPA_RESULTS.map((r) => (
          <div key={r.id} className="oripa-res">
            <div className="or-user">{r.user}</div>
            <div className="or-text">
              {r.emoji} {r.reward}
            </div>
            <span className={`or-tier ${r.tier}`}>{r.box}</span>
            <span className="or-time">{r.time}</span>
          </div>
        ))}
      </div>

      <div className="bggap" />
    </>
  );
}

import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MY_PROFILE, ORIPA_MACHINE, ORIPA_RESULTS } from '@/lib/data';
import type { OripaGrade, OripaPrize } from '@/lib/types';

const GRADE_LABEL: Record<OripaGrade, string> = {
  S: 'S상 · 잭팟',
  A: 'A상',
  B: 'B상',
  C: 'C상',
  last: '라스원상 (마지막 티켓)',
};

function groupByGrade(prizes: OripaPrize[]): Array<[OripaGrade, OripaPrize[]]> {
  const order: OripaGrade[] = ['S', 'A', 'B', 'C', 'last'];
  return order
    .map((g) => [g, prizes.filter((p) => p.grade === g)] as [OripaGrade, OripaPrize[]])
    .filter(([, arr]) => arr.length > 0);
}

export function OripaScreen() {
  const m = ORIPA_MACHINE;
  const grouped = groupByGrade(m.prizes);
  const remainingRatio = Math.round((m.remainingTickets / m.totalTickets) * 100);
  const bundleBonusPct = Math.round(
    ((m.pricePerPull * m.bundleCount - m.bundlePrice) / (m.pricePerPull * m.bundleCount)) * 100,
  );
  const totalRemaining = m.prizes.reduce((s, p) => s + p.remaining, 0);

  return (
    <>
      <StatusBar />
      <AppBar
        title="오리파"
        showBack
        right={<LivePill label={`${MY_PROFILE.points.toLocaleString()}P`} />}
      />

      {/* Hero */}
      <div className="oripa-hero">
        <div className="oh-row">
          <div className="oh-emoji">{m.heroEmoji}</div>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div className="oh-title">{m.title}</div>
            <div className="oh-sub">{m.subtitle}</div>
          </div>
        </div>

        <div className="oh-remain">
          <div className="oh-remain-top">
            <span className="oh-remain-lbl">잔여 티켓</span>
            <span className="oh-remain-num">
              {m.remainingTickets} / {m.totalTickets}
            </span>
          </div>
          <div className="oh-bar-bg">
            <div className="oh-bar-fill" style={{ width: `${remainingRatio}%` }} />
          </div>
        </div>

        <div className="oh-price-row">
          <div className="oh-price">
            <span className="oh-price-lbl">1회 뽑기</span>
            <span className="oh-price-val">🪙 {m.pricePerPull.toLocaleString()}P</span>
          </div>
          <div className="oh-price">
            <span className="oh-price-lbl">{m.bundleCount}회 묶음</span>
            <span className="oh-price-val">🪙 {m.bundlePrice.toLocaleString()}P</span>
            {bundleBonusPct > 0 && (
              <span className="oh-price-bonus">✨ {bundleBonusPct}% 할인</span>
            )}
          </div>
        </div>
      </div>

      {/* 상 목록 */}
      <div className="sect">
        <SectionTitle
          title="상 목록"
          right={<span className="more">남은 상 {totalRemaining}개</span>}
        />
        {grouped.map(([grade, items]) => {
          const groupRemaining = items.reduce((s, p) => s + p.remaining, 0);
          const groupTotal = items.reduce((s, p) => s + p.total, 0);
          return (
            <div key={grade} className="prize-grp">
              <div className={`prize-grp-head g-${grade}`}>
                <span>{GRADE_LABEL[grade]}</span>
                <span className="remain-chip">
                  {groupRemaining} / {groupTotal}
                </span>
              </div>
              {items.map((pz) => (
                <div
                  key={pz.id}
                  className={`prize-card ${pz.remaining === 0 ? 'sold-out' : ''}`}
                >
                  <div className="pc-icon" style={{ background: pz.bg }}>
                    {pz.emoji}
                  </div>
                  <div className="pc-main">
                    <div className="pc-name">{pz.name}</div>
                    {pz.value && <div className="pc-value">{pz.value}</div>}
                  </div>
                  <span className={`pc-count ${pz.remaining === 0 ? 'zero' : ''}`}>
                    {pz.remaining === 0 ? 'SOLD' : `${pz.remaining}/${pz.total}`}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* CTA → 티켓 현황판 */}
      <Link href="/my/oripa/play" className="oripa-cta">
        🎟 티켓 현황판 보기 ▶
      </Link>

      {/* 최근 당첨 */}
      <div className="sect">
        <SectionTitle title="최근 당첨" right={<LivePill />} />
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

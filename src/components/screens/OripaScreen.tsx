'use client';

import { useState } from 'react';
import { LivePointsPill } from '@/components/LivePointsPill';
import { OripaPurchaseModal } from '@/components/OripaPurchaseModal';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { ORIPA_BOXES, ORIPA_RESULTS } from '@/lib/data';
import type { OripaBox } from '@/lib/types';

interface Props {
  /** 서버에서 prisma.oripaPack(active=true) 로드. 없으면 정적 fallback. */
  boxes?: OripaBox[];
}

export function OripaScreen({ boxes }: Props) {
  const list = boxes && boxes.length > 0 ? boxes : ORIPA_BOXES;
  const [picked, setPicked] = useState<OripaBox | null>(null);

  return (
    <>
      <StatusBar />
      <AppBar title="오리파" showBack right={<LivePointsPill />} />

      <div style={{ height: 14 }} />

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,#6B3FA0,#9B6FD0)',
          color: 'var(--white)',
          fontFamily: 'var(--f1)',
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 4px 0 var(--pur-lt),inset 0 -4px 0 var(--pur-dk),7px 7px 0 var(--ink)',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 1 }}>🎲 포인트 뽑기</div>
        <div style={{ fontSize: 8, letterSpacing: 0.4, marginTop: 8, lineHeight: 1.8, opacity: 0.9 }}>
          박스 선택 → 수량 고른 뒤 구매하면 바로 뽑기 페이지로 이동합니다
          <br />
          이미 뽑힌 티켓은 등급이 공개되고, 남은 티켓은 포켓몬볼 뒷면으로 숨겨져 있어요
        </div>
      </div>

      <div className="sect">
        <SectionTitle title="뽑기 박스" right={<span className="more">{list.length}종</span>} />
        {list.length === 0 && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
            }}
          >
            현재 활성 박스가 없어요
          </div>
        )}
        {list.map((b) => (
          <div key={b.id} className={`oripa-box ${b.tier}`}>
            <div className="ob-top">
              <div className="ob-icon">{b.emoji}</div>
              <div className="ob-meta">
                <div className="ob-name">{b.name}</div>
                <div className="ob-desc">{b.desc}</div>
              </div>
            </div>
            <div className="ob-odds">{b.odds}</div>
            {b.stats && <BoxStatsRow stats={b.stats} />}
            <div className="ob-bottom">
              <span className="ob-price">🪙 {b.price.toLocaleString()}P / 회</span>
              <button type="button" className="ob-draw" onClick={() => setPicked(b)}>
                ▶ 뽑기 ▶
              </button>
            </div>
          </div>
        ))}
      </div>

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

      {picked && (
        <OripaPurchaseModal box={picked} onClose={() => setPicked(null)} />
      )}
    </>
  );
}

/* ─────────── 박스 카드 안에 표시되는 등급별 현황 ─────────── */

const STATS_GRADE_COLOR: Record<'S' | 'A' | 'B' | 'C', string> = {
  S: '#6B3FA0',
  A: '#3A5BD9',
  B: '#0D7377',
  C: '#8C5A00',
};

function BoxStatsRow({
  stats,
}: {
  stats: NonNullable<OripaBox['stats']>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        margin: '6px 0 0',
        padding: '6px 8px',
        background: 'rgba(0,0,0,.18)',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        letterSpacing: 0.3,
      }}
    >
      <span style={{ color: 'var(--white)' }}>
        잔여 {stats.remaining}/{stats.total}
      </span>
      <span style={{ color: 'rgba(255,255,255,.4)' }}>·</span>
      {(['S', 'A', 'B', 'C'] as const).map((g) => (
        <span
          key={g}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 5px',
            background: STATS_GRADE_COLOR[g],
            color: 'var(--white)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.3)',
          }}
        >
          {g} {stats.drawn[g]}
        </span>
      ))}
    </div>
  );
}

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

export function OripaScreen() {
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
        <SectionTitle title="뽑기 박스" right={<span className="more">{ORIPA_BOXES.length}종</span>} />
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

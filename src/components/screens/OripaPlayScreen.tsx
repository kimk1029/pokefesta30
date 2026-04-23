'use client';

import { useMemo, useState } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { ORIPA_MACHINE, ORIPA_TICKETS } from '@/lib/data';
import type { OripaGrade, OripaTicket } from '@/lib/types';

interface Result {
  index: number;
  grade: OripaGrade;
  name: string;
  emoji: string;
}

const GRADES: Array<{ g: 'S' | 'A' | 'B' | 'C'; weight: number; name: string; emoji: string }> = [
  { g: 'S', weight: 3,  name: '잉어킹 홀로 프레임', emoji: '🖼' },
  { g: 'A', weight: 12, name: '프리미엄 뱃지',       emoji: '🏅' },
  { g: 'B', weight: 25, name: '몬스터볼 스킨',       emoji: '⚪' },
  { g: 'C', weight: 60, name: '스티커 팩',           emoji: '🌟' },
];

function pickGrade(seed: number) {
  let r = Math.floor((seed * 101) % 100);
  for (const g of GRADES) {
    if (r < g.weight) return g;
    r -= g.weight;
  }
  return GRADES[GRADES.length - 1];
}

export function OripaPlayScreen() {
  const inv = useInventory();
  const [tickets, setTickets] = useState<OripaTicket[]>(() => ORIPA_TICKETS);
  const [result, setResult] = useState<Result | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = useMemo(() => tickets.filter((t) => !t.drawn).length, [tickets]);

  const draw = async (idx: number) => {
    if (busy || tickets[idx].drawn) return;
    setBusy(true);
    const r = await inv.spend(ORIPA_MACHINE.pricePerPull);
    setBusy(false);
    if (!r.ok) {
      setFlash(r.msg ?? '포인트가 부족해요');
      setTimeout(() => setFlash(null), 1400);
      return;
    }
    const g = pickGrade(idx + Date.now());
    const next = [...tickets];
    next[idx] = {
      ...next[idx],
      drawn: true,
      grade: g.g,
      prizeName: g.name,
      prizeEmoji: g.emoji,
      drawnBy: '나',
      drawnAt: '방금 전',
    };
    setTickets(next);
    setResult({ index: idx, grade: g.g, name: g.name, emoji: g.emoji });
  };

  return (
    <>
      <StatusBar />
      <AppBar title="티켓 현황판" showBack />

      <div style={{ height: 14 }} />

      <div className="tgrid-info">
        <div className="tgrid-stat">
          <span className="lbl">잔여 티켓</span>
          <span className="val">
            {remaining} / {ORIPA_MACHINE.totalTickets}
          </span>
        </div>
        <div className="tgrid-stat pts">
          <span className="lbl">보유 포인트</span>
          <span className="val">🪙 {inv.points.toLocaleString()}P</span>
        </div>
      </div>

      <div className="tgrid-legend">
        <span className="lg">
          <span className="sw avail" />남은 티켓
        </span>
        <span className="lg">
          <span className="sw s" />S상
        </span>
        <span className="lg">
          <span className="sw a" />A상
        </span>
        <span className="lg">
          <span className="sw b" />B상
        </span>
        <span className="lg">
          <span className="sw c" />C상
        </span>
      </div>

      {flash && (
        <div
          style={{
            margin: '0 14px 12px',
            padding: 10,
            background: 'var(--ink)',
            color: 'var(--yel)',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 1,
            textAlign: 'center',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),3px 3px 0 var(--red-dk)',
          }}
        >
          ⚠ {flash}
        </div>
      )}

      <div className="tgrid">
        {tickets.map((t) => {
          const cls = t.drawn
            ? `ticket drawn g-${t.grade ?? 'C'}`
            : 'ticket';
          return (
            <button
              key={t.index}
              type="button"
              className={cls}
              onClick={() => draw(t.index)}
              aria-label={`티켓 ${t.index + 1}`}
            >
              <span className="tk-num">#{t.index + 1}</span>
              {t.drawn && <span className="tk-x">✕</span>}
            </button>
          );
        })}
      </div>

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: 12,
          background: 'var(--pap2)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink2)',
          lineHeight: 1.8,
          letterSpacing: 0.3,
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        💡 원하는 티켓을 탭하면 {ORIPA_MACHINE.pricePerPull}P 가 차감되고 숨겨진 상이 공개됩니다. 드래곤 X
        는 이미 뽑힌 티켓.
      </div>

      <div className="bggap" />

      {result && (
        <div className="pull-overlay" onClick={() => setResult(null)}>
          <div className="pull-card" onClick={(e) => e.stopPropagation()}>
            <div className={`pull-tier g-${result.grade}`}>{result.grade}상 당첨</div>
            <div className="pull-emoji">{result.emoji}</div>
            <div className="pull-name">{result.name}</div>
            <div className="pull-sub">티켓 #{result.index + 1} · 마이페이지 보관함 확인</div>
            <button type="button" className="pull-btn" onClick={() => setResult(null)}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { ORIPA_MACHINE, ORIPA_TICKETS } from '@/lib/data';
import { loadOripaTickets, saveOripaTickets } from '@/lib/oripaStorage';
import type { OripaGrade, OripaTicket } from '@/lib/types';

interface Result {
  index: number;
  grade: OripaGrade;
  name: string;
  emoji: string;
}

const GRADES: Array<{
  g: 'S' | 'A' | 'B' | 'C';
  weight: number;
  name: string;
  emoji: string;
}> = [
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
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();

  const qty = Math.max(1, Math.min(10, Number(sp.get('qty') ?? '1') || 1));
  const packId = sp.get('pack') ?? 'default';

  const [tickets, setTickets] = useState<OripaTicket[]>(() => ORIPA_TICKETS);
  const [selected, setSelected] = useState<number[]>([]);
  const [revealing, setRevealing] = useState<number[]>([]); // 현재 오픈 애니메이션 중인 index
  const [revealStage, setRevealStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [results, setResults] = useState<Result[]>([]);
  const [activeReveal, setActiveReveal] = useState<Result | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const unmountedRef = useRef(false);

  useEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  // 저장된 뽑기 이력 복원 — 초기 SSR 렌더(ORIPA_TICKETS) 뒤 한 번 덮어쓰기
  useEffect(() => {
    const stored = loadOripaTickets(packId);
    if (stored && stored.length === ORIPA_TICKETS.length) {
      setTickets(stored);
    }
  }, [packId]);

  const remaining = useMemo(() => tickets.filter((t) => !t.drawn).length, [tickets]);
  const selectionDone = selected.length === qty;

  const toggleSelect = (idx: number) => {
    if (revealStage !== 'idle') return;
    if (tickets[idx].drawn) return;
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((x) => x !== idx);
      if (prev.length >= qty) {
        toast.info(`${qty}장만 선택할 수 있어요`);
        return prev;
      }
      return [...prev, idx];
    });
  };

  const runReveals = async () => {
    if (selected.length !== qty || revealStage !== 'idle') return;
    setRevealStage('running');
    const nextTickets = [...tickets];
    const acc: Result[] = [];
    for (let i = 0; i < selected.length; i++) {
      const idx = selected[i];
      const g = pickGrade(idx + Date.now() + i);
      // 긴장감: 뽑기 전 500ms, 공개 후 900ms
      setRevealing((r) => [...r, idx]);
      await delay(500);
      if (unmountedRef.current) return;
      const r: Result = { index: idx, grade: g.g, name: g.name, emoji: g.emoji };
      acc.push(r);
      setActiveReveal(r);
      nextTickets[idx] = {
        ...nextTickets[idx],
        drawn: true,
        grade: g.g,
        prizeName: g.name,
        prizeEmoji: g.emoji,
        drawnBy: '나',
        drawnAt: '방금 전',
      };
      const snapshot = [...nextTickets];
      setTickets(snapshot);
      saveOripaTickets(packId, snapshot);
      await delay(900);
      if (unmountedRef.current) return;
      setActiveReveal(null);
      setRevealing((rv) => rv.filter((x) => x !== idx));
    }
    setResults(acc);
    setRevealStage('done');
    setShowSummary(true);
  };

  const closeSummary = () => {
    setShowSummary(false);
    setSelected([]);
    setResults([]);
    setRevealStage('idle');
    toast.success(`${qty}장 뽑기 완료`);
  };

  return (
    <>
      <StatusBar />
      <AppBar title="티켓 현황판" showBack />

      <div style={{ height: 14 }} />

      <div className="tgrid-info">
        <div className="tgrid-stat">
          <span className="lbl">구매 수량</span>
          <span className="val">
            {selected.length} / {qty}
          </span>
        </div>
        <div className="tgrid-stat pts">
          <span className="lbl">잔여 티켓</span>
          <span className="val">
            {remaining} / {ORIPA_MACHINE.totalTickets}
          </span>
        </div>
      </div>

      <div className="tgrid-legend">
        <span className="lg">
          <span className="sw avail" />미오픈
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

      <div className="tgrid">
        {tickets.map((t) => {
          const isSelected = selected.includes(t.index);
          const isRevealing = revealing.includes(t.index);
          const cls = t.drawn
            ? `ticket drawn g-${t.grade ?? 'C'}`
            : `ticket${isSelected ? ' selected' : ''}${isRevealing ? ' revealing' : ''}`;
          return (
            <button
              key={t.index}
              type="button"
              className={cls}
              onClick={() => toggleSelect(t.index)}
              aria-label={t.drawn ? `${t.grade}상 티켓` : '미오픈 티켓'}
              disabled={t.drawn || revealStage !== 'idle'}
            >
              {t.drawn && <span className="tk-grade">{t.grade}</span>}
              {isSelected && !t.drawn && <span className="tk-check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* 가이드 / CTA */}
      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '12px 14px',
          background: selectionDone ? 'var(--red)' : 'var(--pap2)',
          color: selectionDone ? 'var(--white)' : 'var(--ink2)',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          letterSpacing: 0.5,
          lineHeight: 1.7,
          textAlign: 'center',
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
        }}
      >
        {revealStage === 'running'
          ? '✨ 뽑기 중...'
          : selectionDone
            ? `${qty}장 선택 완료 · 아래 버튼으로 오픈`
            : `티켓을 ${qty - selected.length}장 더 선택하세요`}
      </div>

      <button
        type="button"
        className="pri-btn"
        onClick={runReveals}
        disabled={!selectionDone || revealStage !== 'idle'}
        style={{ opacity: selectionDone && revealStage === 'idle' ? 1 : 0.55 }}
      >
        {revealStage === 'running' ? '▶ 오픈 중 ▶' : `▶ ${qty}장 오픈 ▶`}
      </button>

      <div className="bggap" />

      {/* 개별 공개 애니메이션 — 풀스크린 오버레이 (1장씩 긴장감) */}
      {activeReveal && (
        <div className="pull-overlay" style={{ animation: 'pf-fade-in 200ms steps(4) backwards' }}>
          <div
            className="pull-card"
            style={{ animation: 'pf-reveal-pop 500ms steps(6) backwards' }}
          >
            <div className={`pull-tier g-${activeReveal.grade}`}>{activeReveal.grade}상 당첨</div>
            <div className="pull-emoji" style={{ fontSize: 72 }}>
              {activeReveal.emoji}
            </div>
            <div className="pull-name">{activeReveal.name}</div>
            <div className="pull-sub">티켓 #{activeReveal.index + 1}</div>
          </div>
        </div>
      )}

      {/* 최종 결과 요약 모달 */}
      {showSummary && (
        <div className="pull-overlay" onClick={closeSummary}>
          <div className="pull-card" onClick={(e) => e.stopPropagation()}>
            <div className="pull-tier" style={{ background: 'var(--ink)', color: 'var(--yel)' }}>
              {qty}장 뽑기 결과
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, width: '100%' }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`ticket drawn g-${r.grade}`}
                  style={{ position: 'relative', pointerEvents: 'none' }}
                >
                  <span className="tk-grade">{r.grade}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                gap: 8,
                width: '100%',
                fontFamily: 'var(--f1)',
                fontSize: 9,
              }}
            >
              {(['S', 'A', 'B', 'C'] as const).map((g) => {
                const n = results.filter((r) => r.grade === g).length;
                return (
                  <span key={g} style={{ color: n > 0 ? 'var(--red)' : 'var(--ink3)' }}>
                    {g}: {n}
                  </span>
                );
              })}
            </div>
            <button type="button" className="pull-btn" onClick={closeSummary}>
              확인
            </button>
            <button
              type="button"
              onClick={() => {
                closeSummary();
                router.push('/my/oripa');
              }}
              style={{
                background: 'transparent',
                color: 'var(--ink3)',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                padding: 6,
                cursor: 'pointer',
                border: 'none',
                textDecoration: 'underline',
              }}
            >
              다른 박스 뽑으러 가기 →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

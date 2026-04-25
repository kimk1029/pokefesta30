'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { ORIPA_MACHINE } from '@/lib/data';
import type { OripaGrade, OripaTicket } from '@/lib/types';

interface Result {
  index: number;
  grade: OripaGrade;
  name: string;
  emoji: string;
}

interface PullResponse {
  results: Array<{ index: number; grade: OripaGrade; prizeName: string; prizeEmoji: string }>;
  alreadyDrawn: number[];
}

const POLL_MS = 8_000;

interface Props {
  packId: string;
  qty: number;
  initialTickets: OripaTicket[];
}

export function OripaPlayScreen({ packId, qty, initialTickets }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [tickets, setTickets] = useState<OripaTicket[]>(initialTickets);
  const [selected, setSelected] = useState<number[]>([]);
  const [revealing, setRevealing] = useState<number[]>([]);
  const [revealStage, setRevealStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [results, setResults] = useState<Result[]>([]);
  const [activeReveal, setActiveReveal] = useState<Result | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const unmountedRef = useRef(false);
  const stageRef = useRef(revealStage);

  stageRef.current = revealStage;

  useEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  // 서버 티켓 fetch — 폴링으로 다른 유저 뽑기 반영
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/oripa/${packId}/tickets`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { data: OripaTicket[] };
      if (!unmountedRef.current && Array.isArray(data.data)) {
        setTickets((prev) => {
          // 길이 보존 + 현재 reveal 중인 index 는 서버가 아직 덮어쓰기 전일 수 있으니 보존
          const revealingSet = new Set(stageRef.current === 'running' ? [] : []);
          if (prev.length !== data.data.length) return data.data;
          return data.data;
        });
      }
    } catch {
      // ignore
    }
  }, [packId]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (stageRef.current === 'running') return;
      void refresh();
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [refresh]);

  const remaining = useMemo(() => tickets.filter((t) => !t.drawn).length, [tickets]);
  const selectionDone = selected.length === qty;

  const toggleSelect = (idx: number) => {
    if (revealStage !== 'idle') return;
    if (tickets[idx]?.drawn) return;
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

    // 서버에 실제 pull 요청 — 원자적 업데이트
    let payload: PullResponse;
    try {
      const res = await fetch(`/api/oripa/${packId}/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          res.status === 401
            ? '로그인 후 이용 가능합니다'
            : (err as { error?: string }).error ?? '뽑기 실패';
        toast.error(msg);
        setRevealStage('idle');
        void refresh();
        return;
      }
      payload = (await res.json()) as PullResponse;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '네트워크 오류');
      setRevealStage('idle');
      void refresh();
      return;
    }

    const { results: serverResults, alreadyDrawn } = payload;

    if (serverResults.length === 0) {
      toast.error('다른 유저가 먼저 뽑았어요');
      setSelected([]);
      setRevealStage('idle');
      void refresh();
      return;
    }

    // 성공한 티켓 하나씩 애니메이션
    const acc: Result[] = [];
    const nextTickets = [...tickets];
    for (let i = 0; i < serverResults.length; i++) {
      const pr = serverResults[i];
      setRevealing((r) => [...r, pr.index]);
      await delay(500);
      if (unmountedRef.current) return;
      const r: Result = {
        index: pr.index,
        grade: pr.grade,
        name: pr.prizeName,
        emoji: pr.prizeEmoji,
      };
      acc.push(r);
      setActiveReveal(r);
      nextTickets[pr.index] = {
        ...nextTickets[pr.index],
        drawn: true,
        grade: pr.grade,
        prizeName: pr.prizeName,
        prizeEmoji: pr.prizeEmoji,
        drawnBy: '나',
        drawnAt: '방금 전',
      };
      setTickets([...nextTickets]);
      await delay(900);
      if (unmountedRef.current) return;
      setActiveReveal(null);
      setRevealing((rv) => rv.filter((x) => x !== pr.index));
    }

    setResults(acc);
    setRevealStage('done');
    setShowSummary(true);
    if (alreadyDrawn.length > 0) {
      toast.info(`${alreadyDrawn.length}장은 이미 다른 유저가 뽑았어요`);
    }
    // 서버 상태 재동기화
    void refresh();
  };

  const closeSummary = () => {
    setShowSummary(false);
    setSelected([]);
    setResults([]);
    setRevealStage('idle');
    toast.success(`${results.length}장 뽑기 완료`);
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

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '12px 14px',
          background: selectionDone ? 'var(--red)' : 'var(--pap2)',
          color: selectionDone ? 'var(--white)' : 'var(--ink2)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
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

      {activeReveal && (
        <div className="pull-overlay" style={{ animation: 'pf-fade-in 200ms steps(4) backwards' }}>
          <div className="pull-card" style={{ animation: 'pf-reveal-pop 500ms steps(6) backwards' }}>
            <div className={`pull-tier g-${activeReveal.grade}`}>{activeReveal.grade}상 당첨</div>
            <div className="pull-emoji" style={{ fontSize: 71 }}>
              {activeReveal.emoji}
            </div>
            <div className="pull-name">{activeReveal.name}</div>
            <div className="pull-sub">티켓 #{activeReveal.index + 1}</div>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="pull-overlay" onClick={closeSummary}>
          <div className="pull-card" onClick={(e) => e.stopPropagation()}>
            <div className="pull-tier" style={{ background: 'var(--ink)', color: 'var(--yel)' }}>
              {results.length}장 뽑기 결과
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
                fontSize: 8,
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
                fontSize: 8,
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

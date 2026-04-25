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
  /** 수량 채운 직후 노출되는 "오픈/다시고르기" 확인 모달 */
  const [showConfirm, setShowConfirm] = useState(false);
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
      const next = [...prev, idx];
      // 수량 채우면 자동으로 확인 모달
      if (next.length === qty) {
        setTimeout(() => {
          if (!unmountedRef.current) setShowConfirm(true);
        }, 250);
      }
      return next;
    });
  };

  /** 미오픈 티켓 중 랜덤으로 qty 장 자동 선택 → 바로 확인 모달 */
  const randomPick = () => {
    if (revealStage !== 'idle') return;
    const available = tickets.filter((t) => !t.drawn).map((t) => t.index);
    if (available.length < qty) {
      toast.error(`남은 티켓이 ${qty}장 미만이에요`);
      return;
    }
    // Fisher-Yates 부분 셔플
    const arr = [...available];
    for (let i = arr.length - 1; i > arr.length - 1 - qty; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const picked = arr.slice(arr.length - qty);
    setSelected(picked);
    setShowConfirm(true);
  };

  const clearSelection = () => {
    setSelected([]);
    setShowConfirm(false);
  };

  const runReveals = async () => {
    if (selected.length !== qty || revealStage !== 'idle') return;
    setShowConfirm(false);
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

    // 성공한 티켓 하나씩 애니메이션 — 봉투가 들썩 → 뜯김 + 폭죽 → 등급 공개
    const acc: Result[] = [];
    const nextTickets = [...tickets];
    for (let i = 0; i < serverResults.length; i++) {
      const pr = serverResults[i];
      setRevealing((r) => [...r, pr.index]);
      await delay(400); // 카드 들썩 시간
      if (unmountedRef.current) return;
      const r: Result = {
        index: pr.index,
        grade: pr.grade,
        name: pr.prizeName,
        emoji: pr.prizeEmoji,
      };
      acc.push(r);
      setActiveReveal(r); // 뜯기 + 폭죽 애니메이션 시작
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
      await delay(1700); // 봉투 뜯기(700) + 등급 등장(950)
      if (unmountedRef.current) return;
      setActiveReveal(null);
      setRevealing((rv) => rv.filter((x) => x !== pr.index));
      await delay(150);
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

      {/* 랜덤 오픈 — 직접 고르기 귀찮을 때 */}
      <div style={{ margin: '0 var(--gap) var(--cg)' }}>
        <button
          type="button"
          onClick={randomPick}
          disabled={revealStage !== 'idle' || remaining < qty}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: revealStage === 'idle' ? 'var(--pur)' : 'var(--ink3)',
            color: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 1,
            cursor: revealStage === 'idle' ? 'pointer' : 'not-allowed',
            opacity: revealStage === 'idle' && remaining >= qty ? 1 : 0.55,
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 var(--pur-lt),inset 0 -3px 0 var(--pur-dk),4px 4px 0 var(--ink)',
            transition: 'transform .05s steps(1),box-shadow .05s steps(1)',
          }}
          aria-label={`랜덤으로 ${qty}장 자동 선택`}
        >
          🎲 랜덤으로 {qty}장 자동 선택
        </button>
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
        onClick={() => {
          if (selectionDone) setShowConfirm(true);
        }}
        disabled={!selectionDone || revealStage !== 'idle'}
        style={{ opacity: selectionDone && revealStage === 'idle' ? 1 : 0.55 }}
      >
        {revealStage === 'running' ? '▶ 오픈 중 ▶' : `▶ ${qty}장 오픈 확인 ▶`}
      </button>

      <div className="bggap" />

      {activeReveal && (
        <div
          className="pull-overlay"
          style={{ animation: 'pf-fade-in 200ms steps(4) backwards' }}
        >
          <div
            className="pull-card"
            style={{ animation: 'pf-reveal-pop 500ms steps(6) backwards' }}
          >
            {/* 봉투가 좌우로 뜯어지는 무대 */}
            <div className="tear-stage">
              <div className="confetti" aria-hidden>
                <span /><span /><span /><span /><span /><span />
                <span /><span /><span /><span /><span /><span />
              </div>
              <div className="tear-half l" aria-hidden />
              <div className="tear-half r" aria-hidden />
              <div className="tear-prize">
                <div
                  className={`pull-tier g-${activeReveal.grade}`}
                  style={{ marginBottom: 6 }}
                >
                  {activeReveal.grade}상
                </div>
                <div style={{ fontSize: 60, lineHeight: 1 }}>{activeReveal.emoji}</div>
              </div>
            </div>
            <div className="pull-name" style={{ marginTop: 10 }}>{activeReveal.name}</div>
            <div className="pull-sub">티켓 #{activeReveal.index + 1}</div>
          </div>
        </div>
      )}

      {/* 수량 채우면 뜨는 확인 모달 — *장 오픈 / 다시 고르기 */}
      {showConfirm && revealStage === 'idle' && (
        <div className="pull-overlay" onClick={() => setShowConfirm(false)}>
          <div
            className="pull-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 320 }}
          >
            <div
              className="pull-tier"
              style={{ background: 'var(--ink)', color: 'var(--yel)' }}
            >
              {qty}장 선택 완료
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink2)',
                lineHeight: 1.8,
                textAlign: 'center',
                padding: '0 8px',
              }}
            >
              선택한 {qty}장의 티켓을 한 번에 오픈합니다
              <br />
              한 번 오픈하면 되돌릴 수 없어요
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))',
                gap: 4,
                width: '100%',
                marginBottom: 6,
              }}
            >
              {selected.slice().sort((a, b) => a - b).map((idx) => (
                <div
                  key={idx}
                  style={{
                    aspectRatio: '1/1',
                    background: 'var(--grn)',
                    color: 'var(--white)',
                    fontFamily: 'var(--f1)',
                    fontSize: 8,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow:
                      '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                  }}
                >
                  #{idx + 1}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="pull-btn"
              onClick={runReveals}
              style={{ width: '100%' }}
            >
              ▶ {qty}장 오픈 ▶
            </button>
            <button
              type="button"
              onClick={clearSelection}
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
              ← 다시 고르기
            </button>
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

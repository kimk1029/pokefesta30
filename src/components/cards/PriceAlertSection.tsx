'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Price } from '@/components/Price';
import { useToast } from '@/components/ToastProvider';

/**
 * 가격 알림 설정 — 카드 시세가 목표가(JPY) 이하로 내려오면 알림.
 * `/api/me/price-alerts` (GET/POST/DELETE) 와 연동. 미로그인 시 /login 으로.
 * 트리거되면 서버가 알림함(Message)으로 통지한다.
 */

interface Props {
  apparelId: number;
  cardName: string;
  /** 현재 시세(JPY) — 목표가 기본 제안값 계산에 사용. */
  currentPriceJpy: number;
}

interface AlertRow {
  snkrdunkApparelId: number;
  targetPriceJpy: number;
  triggeredAt: string | null;
}

/** 보기 좋은 기본 제안가 — 현재가의 90%를 천 단위로 내림. */
function suggestTarget(cur: number): number {
  if (!cur || cur <= 0) return 0;
  const v = Math.floor((cur * 0.9) / 1000) * 1000;
  return v > 0 ? v : Math.floor(cur / 1000) * 1000;
}

export function PriceAlertSection({ apparelId, cardName, currentPriceJpy }: Props) {
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [existing, setExisting] = useState<AlertRow | null>(null);
  const [target, setTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/price-alerts', { credentials: 'include', cache: 'no-store' });
        if (!alive) return;
        if (r.status === 401) {
          setAuthed(false);
        } else if (r.ok) {
          const j = (await r.json()) as { data?: AlertRow[] };
          const mine = (j.data ?? []).find((a) => a.snkrdunkApparelId === apparelId) ?? null;
          setExisting(mine);
          setTarget(String(mine?.targetPriceJpy ?? suggestTarget(currentPriceJpy)));
        }
      } catch {
        // 미로그인/네트워크 — 기본 제안값 유지
        if (alive) setTarget(String(suggestTarget(currentPriceJpy)));
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apparelId, currentPriceJpy]);

  const goLogin = () => {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
  };

  const targetNum = Math.round(Number(target.replace(/[^\d]/g, '')) || 0);

  const save = async () => {
    if (busy) return;
    if (!authed) return goLogin();
    if (targetNum <= 0) {
      toast.error('목표가를 입력하세요');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/me/price-alerts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snkrdunkApparelId: apparelId, targetPriceJpy: targetNum, cardName }),
      });
      if (r.status === 401) return goLogin();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { data?: AlertRow };
      setExisting(j.data ?? { snkrdunkApparelId: apparelId, targetPriceJpy: targetNum, triggeredAt: null });
      toast.success('가격 알림이 설정되었습니다');
    } catch (err) {
      toast.error(`알림 설정 실패: ${err instanceof Error ? err.message : '오류'}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/me/price-alerts/${apparelId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (r.status === 401) return goLogin();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setExisting(null);
      toast.success('가격 알림이 해제되었습니다');
    } catch (err) {
      toast.error(`알림 해제 실패: ${err instanceof Error ? err.message : '오류'}`);
    } finally {
      setBusy(false);
    }
  };

  const isOn = Boolean(existing);

  return (
    <div className="sect">
      <div className="sect-hd">
        <h2>가격 알림</h2>
        {isOn && <span className="more">설정됨</span>}
      </div>
      <Panel style={{ padding: 16 }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', letterSpacing: 0.3, lineHeight: 1.6 }}>
          {isOn
            ? existing!.triggeredAt
              ? '목표가에 도달해 알림을 보냈어요. 다시 설정하면 재활성화됩니다.'
              : '목표가 이하로 내려오면 알림함으로 알려드려요.'
            : '원하는 가격에 도달하면 알림함으로 알려드려요. (엔화 기준)'}
        </div>

        {/* 목표가 입력 */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid var(--pap3)',
            borderRadius: 'var(--r-sm)',
            padding: '10px 12px',
            background: 'var(--pap2)',
          }}
        >
          <span style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 700, color: 'var(--ink3)' }}>¥</span>
          <input
            inputMode="numeric"
            value={target ? Number(targetNum).toLocaleString('ja-JP') : ''}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="목표가 입력"
            disabled={!loaded}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--f1)',
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: 0.3,
            }}
          />
          <span style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>이하</span>
        </div>
        {targetNum > 0 && (
          <div style={{ marginTop: 6, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: 0.3 }}>
            ≈ <Price jpy={targetNum} /> 이하일 때 알림
          </div>
        )}

        {/* 빠른 선택 (현재가 대비) */}
        {currentPriceJpy > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[0.95, 0.9, 0.8].map((r) => {
              const v = Math.floor((currentPriceJpy * r) / 1000) * 1000;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTarget(String(v))}
                  style={{
                    flex: 'none',
                    fontFamily: 'var(--f1)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid var(--pap3)',
                    background: targetNum === v ? 'var(--ink)' : 'var(--pap2)',
                    color: targetNum === v ? 'var(--white)' : 'var(--ink3)',
                    cursor: 'pointer',
                  }}
                >
                  -{Math.round((1 - r) * 100)}%
                </button>
              );
            })}
          </div>
        )}

        {/* 등록/해제 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={save}
            disabled={busy || !loaded}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 13,
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: isOn ? 'var(--grn)' : 'var(--ink)',
              color: 'var(--white)',
              fontFamily: 'var(--f1)',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.5,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            🔔 {isOn ? '알림 변경' : '알림 등록'}
          </button>
          {isOn && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              style={{
                flex: 'none',
                padding: '13px 16px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--pap3)',
                background: 'var(--pap2)',
                color: 'var(--ink3)',
                fontFamily: 'var(--f1)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              해제
            </button>
          )}
        </div>
        {!authed && (
          <div style={{ marginTop: 10, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)' }}>
            로그인하면 알림을 설정할 수 있어요.
          </div>
        )}
      </Panel>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { REWARDS } from '@/lib/rewards';
import { useInventory } from '@/lib/use-inventory';

interface Props {
  tradeId: number;
  status: string;
  isAuthor: boolean;
}

const LABEL: Record<string, string> = {
  open: '거래 중',
  reserved: '예약 중',
  done: '거래 완료',
  cancelled: '취소됨',
};

export function TradeStatusActions({ tradeId, status, isAuthor }: Props) {
  const router = useRouter();
  const { grantPoints } = useInventory();
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isAuthor) return null;

  const patch = async (next: string) => {
    setPending(next);
    setMsg(null);
    try {
      const r = await fetch(`/api/trades/${tradeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? '상태 변경 실패');
      }
      if (next === 'done' && status !== 'done') {
        grantPoints(REWARDS.trade_done);
        setMsg(`✓ 거래 완료 · +${REWARDS.trade_done}P 획득`);
      } else {
        setMsg(`✓ "${LABEL[next] ?? next}" 로 변경`);
      }
      setTimeout(() => {
        setMsg(null);
        router.refresh();
      }, 1200);
    } catch (e) {
      setMsg(e instanceof Error ? `⚠ ${e.message}` : '⚠ 실패');
      setTimeout(() => setMsg(null), 1600);
    } finally {
      setPending(null);
    }
  };

  const btnBase: React.CSSProperties = {
    padding: '10px 14px',
    fontFamily: 'var(--f1)',
    fontSize: 10,
    letterSpacing: 1,
    cursor: 'pointer',
    border: 'none',
    color: 'var(--white)',
    boxShadow:
      '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
  };
  const btn = (bg: string): React.CSSProperties => ({ ...btnBase, background: bg });

  return (
    <div style={{ marginTop: 12 }}>
      {msg && (
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            background: 'var(--ink)',
            color: 'var(--yel)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          {msg}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <button
          type="button"
          onClick={() => patch('open')}
          disabled={pending !== null || status === 'open'}
          style={{ ...btn('var(--blu)'), opacity: status === 'open' ? 0.55 : 1 }}
        >
          거래 중
        </button>
        <button
          type="button"
          onClick={() => patch('reserved')}
          disabled={pending !== null || status === 'reserved'}
          style={{ ...btn('var(--orn)'), opacity: status === 'reserved' ? 0.55 : 1 }}
        >
          예약 중
        </button>
        <button
          type="button"
          onClick={() => patch('done')}
          disabled={pending !== null || status === 'done'}
          style={{ ...btn('var(--grn-dk)'), opacity: status === 'done' ? 0.55 : 1 }}
        >
          {status === 'done' ? '완료' : `완료 +${REWARDS.trade_done}P`}
        </button>
      </div>
    </div>
  );
}

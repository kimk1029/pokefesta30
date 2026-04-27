'use client';

import { useRef, useState, useTransition } from 'react';

interface Props {
  tradeId: number;
  initialCount: number;
}

const MAX = 3;

export function BumpButton({ tradeId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const remaining = MAX - count;

  const bump = () => {
    if (pending || pendingRef.current || remaining <= 0) return;
    pendingRef.current = true;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/trades/${tradeId}/bump`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json() as { bumpCount: number };
          setCount(data.bumpCount);
        }
      } finally {
        pendingRef.current = false;
      }
    });
  };

  return (
    <button
      onClick={bump}
      disabled={pending || remaining <= 0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: remaining > 0 ? 'var(--accent)' : 'var(--border)',
        color: remaining > 0 ? '#fff' : 'var(--muted)',
        border: 'none',
        borderRadius: 10,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: remaining > 0 ? 'pointer' : 'not-allowed',
        opacity: pending ? 0.6 : 1,
        width: '100%',
        justifyContent: 'center',
      }}
    >
      ⬆ 최신화하기
      <span style={{ fontSize: 11, opacity: 0.8 }}>
        ({remaining > 0 ? `${remaining}회 남음` : '횟수 소진'})
      </span>
    </button>
  );
}

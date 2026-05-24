'use client';

import { useEffect, useState } from 'react';

/** 오늘(KST) 23:00 = 14:00 UTC 의 epoch ms. */
function todayClose2300Kst(): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  return Date.UTC(y, m - 1, d, 14, 0, 0); // 23:00 KST
}

function fmtRemain(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** "오늘 마감 경매" 옆에 23:00 마감까지 남은 시간을 실시간 표시. */
export function AuctionCountdown() {
  const [remain, setRemain] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemain(todayClose2300Kst() - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // SSR/하이드레이션 불일치 방지: 첫 계산 전엔 비움
  if (remain === null) return null;

  const ended = remain <= 0;
  return (
    <span
      style={{
        fontFamily: 'var(--f1)',
        fontSize: 11,
        letterSpacing: 0.3,
        color: ended ? 'var(--ink3)' : 'var(--red)',
        whiteSpace: 'nowrap',
      }}
    >
      {ended ? '⏳ 23:00 마감 종료' : `⏳ 마감까지 ${fmtRemain(remain)}`}
    </span>
  );
}

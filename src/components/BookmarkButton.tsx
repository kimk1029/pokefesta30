'use client';

import { useState, useTransition } from 'react';

interface Props {
  tradeId?: number;
  feedId?: number;
  initial?: boolean;
}

export function BookmarkButton({ tradeId, feedId, initial = false }: Props) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId, feedId }),
        });
        if (res.ok) {
          const data = await res.json() as { bookmarked: boolean };
          setBookmarked(data.bookmarked);
        }
      } catch {
        // ignore
      }
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={bookmarked ? '찜 해제' : '찜하기'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: 1,
        padding: '4px',
        opacity: pending ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {bookmarked ? '💛' : '🤍'}
    </button>
  );
}

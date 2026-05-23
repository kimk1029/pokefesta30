'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { startRouteTransition } from '@/components/RouteProgress';

export function HomeKoSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    startRouteTransition();
    router.push(`/cards/snkrdunk/search?q=${encodeURIComponent(trimmed)}`);
  }

  function onClear() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div style={{ margin: '0 var(--gap) var(--cg)' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          position: 'relative',
          height: 44,
          width: '100%',
        }}
      >
        {/* 아이콘 (input 안 좌측) */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            fontSize: 15,
            color: 'var(--ink3)',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>

        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="한국어로 카드 검색 (예: 리자몽, 피카츄)"
          aria-label="스니덩크 한국어 검색"
          style={{
            width: '100%',
            height: 44,
            padding: '0 56px 0 36px',
            border: 'none',
            outline: 'none',
            background: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink)',
            letterSpacing: 0.3,
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 2px 2px 0 rgba(0,0,0,.08),4px 4px 0 var(--ink)',
          }}
        />

        {/* Clear */}
        {query && (
          <button
            type="button"
            onClick={onClear}
            aria-label="검색어 지우기"
            style={{
              position: 'absolute',
              right: 48,
              top: 8,
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              color: 'var(--ink3)',
            }}
          >
            ✕
          </button>
        )}

        {/* Submit (input 안 우측) */}
        <button
          type="submit"
          aria-label="검색"
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            width: 32,
            height: 32,
            border: 'none',
            background: 'var(--ink)',
            color: 'var(--gold)',
            cursor: 'pointer',
            fontFamily: 'var(--f1)',
            fontSize: 13,
            letterSpacing: 0,
            boxShadow:
              '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--yel-dk)',
          }}
        >
          ▶
        </button>
      </form>
    </div>
  );
}

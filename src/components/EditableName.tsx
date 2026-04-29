'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  initialName: string;
}

export function EditableName({ initialName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const trimmed = input.trim();
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/me/name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setName(trimmed);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  if (editing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          minWidth: 0,
        }}>
          <input
            value={input}
            autoFocus
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); save(); }
              if (e.key === 'Escape') { setEditing(false); setInput(name); setErr(null); }
            }}
            maxLength={20}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              width: '100%',
              padding: '4px 8px',
              fontFamily: 'var(--f1)',
              fontSize: 13,
              letterSpacing: 1,
              color: 'var(--ink)',
              background: 'var(--white)',
              border: 'none',
              outline: 'none',
              boxShadow: 'inset 2px 2px 0 rgba(0,0,0,.1)',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            aria-label="저장"
            style={btnStyle('var(--yel)')}
          >
            {busy ? '…' : '✓'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setInput(name); setErr(null); }}
            aria-label="취소"
            style={btnStyle('var(--pap2)')}
          >
            ✕
          </button>
        </div>
        {err && <div style={{ fontSize: 8, color: 'var(--red)' }}>⚠ {err}</div>}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      maxWidth: '100%',
    }}>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}>{name}</span>
      <button
        type="button"
        onClick={() => { setInput(name); setEditing(true); }}
        aria-label="닉네임 수정"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          padding: 2,
          opacity: 0.85,
          // 연필이 기본 가로로 놓여있는 글꼴에서도 45° 기울여 편집 포즈로
          display: 'inline-block',
          transform: 'rotate(-45deg)',
          lineHeight: 1,
        }}
      >
        ✏
      </button>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    background: bg,
    color: 'var(--ink)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    display: 'inline-grid',
    placeItems: 'center',
  };
}

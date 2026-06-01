'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  src: string | null;
  alt: string;
}

export function SnkrdunkImageZoom({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const isClean = theme === 'clean';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (src) setOpen(true);
        }}
        aria-label={src ? `${alt} 이미지 확대 보기` : alt}
        style={{
          width: 96,
          height: 96,
          flexShrink: 0,
          background: 'var(--pap2)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          padding: 0,
          cursor: src ? 'zoom-in' : 'default',
          ...(isClean
            ? { border: '1px solid var(--pap3)', borderRadius: 0, boxShadow: '0 1px 3px rgba(16,18,22,.12)' }
            : { border: 'none', boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)' }),
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 37 }}>🃏</span>
        )}
      </button>
      {open && src ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: '95vw', maxHeight: '85vh', objectFit: 'contain', imageRendering: 'pixelated' as never }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="닫기"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: 'var(--ink)',
              color: 'var(--gold)',
              fontFamily: 'var(--f1)',
              fontSize: 12,
              letterSpacing: 0.5,
              padding: '8px 12px',
              border: '2px solid var(--gold)',
              cursor: 'pointer',
            }}
          >
            ✕ 닫기
          </button>
        </div>
      ) : null}
    </>
  );
}

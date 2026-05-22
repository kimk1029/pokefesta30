'use client';

import { useEffect, useState } from 'react';
import { snkrdunkApparelUrl } from '@/lib/snkrdunk';

interface Props {
  apparelId: number;
  /** 추가시 별칭으로 저장될 카드명. 비우면 null. */
  cardName?: string;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 카드 시세 상세 페이지의 액션 줄 — 컬렉션 추가 / 관심 / 스니덩크 외부링크.
 * 컬렉션은 `/api/me/cards`, 관심은 `/api/me/favorites` 를 호출.
 * 미로그인 시 클릭하면 `/login` 으로 이동.
 */
export function CardActions({ apparelId, cardName }: Props) {
  const [collectStatus, setCollectStatus] = useState<Status>('idle');
  const [favStatus, setFavStatus] = useState<Status>('idle');
  const [isFav, setIsFav] = useState<boolean>(false);

  // 마운트 시 현재 관심 여부 확인 — toggle UI 일관성 위해.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/favorites', { credentials: 'include', cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as { data?: Array<{ snkrdunkApparelId: number }> };
        if (!alive) return;
        const has = (j.data ?? []).some((row) => row.snkrdunkApparelId === apparelId);
        setIsFav(has);
      } catch {
        // ignore — 미로그인일 가능성
      }
    })();
    return () => {
      alive = false;
    };
  }, [apparelId]);

  const goLogin = () => {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
  };

  const addToCollection = async () => {
    if (collectStatus === 'loading') return;
    setCollectStatus('loading');
    try {
      const r = await fetch('/api/me/cards', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snkrdunkApparelId: apparelId,
          nickname: cardName?.slice(0, 60) ?? undefined,
        }),
      });
      if (r.status === 401) {
        goLogin();
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      setCollectStatus('done');
      setTimeout(() => setCollectStatus('idle'), 1500);
    } catch {
      setCollectStatus('error');
      setTimeout(() => setCollectStatus('idle'), 1500);
    }
  };

  const toggleFavorite = async () => {
    if (favStatus === 'loading') return;
    setFavStatus('loading');
    const wantOn = !isFav;
    try {
      const r = await fetch(
        wantOn
          ? '/api/me/favorites'
          : `/api/me/favorites/${apparelId}`,
        {
          method: wantOn ? 'POST' : 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: wantOn ? JSON.stringify({ snkrdunkApparelId: apparelId }) : undefined,
        },
      );
      if (r.status === 401) {
        goLogin();
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      setIsFav(wantOn);
      setFavStatus('done');
      setTimeout(() => setFavStatus('idle'), 800);
    } catch {
      setFavStatus('error');
      setTimeout(() => setFavStatus('idle'), 1200);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        margin: '0 var(--gap) var(--cg)',
      }}
    >
      <ActionBtn
        onClick={addToCollection}
        disabled={collectStatus === 'loading'}
        label={
          collectStatus === 'loading'
            ? '추가 중...'
            : collectStatus === 'done'
              ? '추가됨 ✓'
              : collectStatus === 'error'
                ? '실패'
                : '＋ 컬렉션'
        }
        bg="var(--white)"
        fg="var(--ink)"
      />
      <ActionBtn
        onClick={toggleFavorite}
        disabled={favStatus === 'loading'}
        label={isFav ? '★ 관심' : '☆ 관심'}
        bg={isFav ? 'var(--yel)' : 'var(--white)'}
        fg="var(--ink)"
      />
      <a
        href={snkrdunkApparelUrl(apparelId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="스니덩크에서 보기"
        style={{
          flex: '0 0 auto',
          minWidth: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '8px 10px',
          background: 'var(--ink)',
          color: 'var(--gold)',
          textDecoration: 'none',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          letterSpacing: 0.3,
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--yel-dk)',
        }}
      >
        🇯🇵 ↗
      </a>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  label,
  bg,
  fg,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '8px 6px',
        fontFamily: 'var(--f1)',
        fontSize: 10,
        letterSpacing: 0.3,
        background: bg,
        color: fg,
        border: 0,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        boxShadow:
          '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
      }}
    >
      {label}
    </button>
  );
}

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
 * 카드 시세 상세 페이지의 액션 줄 — 모바일 PixelPress 와 동일 라벨/룩.
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

  const collectDesc =
    collectStatus === 'loading'
      ? '...'
      : collectStatus === 'done'
        ? '✓'
        : collectStatus === 'error'
          ? '!'
          : '추가';

  const favDesc =
    favStatus === 'loading' ? '...' : favStatus === 'error' ? '!' : isFav ? '✓' : '추가';

  return (
    <div className="snk-act-row">
      <button
        type="button"
        className="snk-act"
        onClick={addToCollection}
        disabled={collectStatus === 'loading'}
        style={{ background: 'var(--blu)', color: 'var(--white)' }}
      >
        <span className="snk-act-icon" aria-hidden>📦</span>
        <span className="snk-act-label">내 컬렉션</span>
        <span className="snk-act-desc">{collectDesc}</span>
      </button>
      <button
        type="button"
        className="snk-act"
        onClick={toggleFavorite}
        disabled={favStatus === 'loading'}
        style={{ background: 'var(--pur)', color: 'var(--white)' }}
      >
        <span className="snk-act-icon" aria-hidden>{isFav ? '★' : '⭐'}</span>
        <span className="snk-act-label">관심카드</span>
        <span className="snk-act-desc">{favDesc}</span>
      </button>
      <a
        className="snk-act"
        href={snkrdunkApparelUrl(apparelId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SNKDUNK 에서 보기"
        style={{ background: 'var(--ink)', color: 'var(--gold)' }}
      >
        <span className="snk-act-icon" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/snkrdunk-icon.png" alt="" />
        </span>
        <span className="snk-act-label">SNKDUNK</span>
        <span className="snk-act-desc">↗</span>
      </a>
    </div>
  );
}

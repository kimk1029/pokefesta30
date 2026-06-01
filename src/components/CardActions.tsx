'use client';

import { useEffect, useState } from 'react';
import { snkrdunkApparelUrl } from '@/lib/snkrdunk';
import { useToast } from '@/components/ToastProvider';
import { CardRegisterSheet } from '@/components/cards/CardRegisterSheet';

interface Props {
  apparelId: number;
  /** 추가시 별칭으로 저장될 카드명. 비우면 null. */
  cardName?: string;
  /** 카드등록 시트에 표시할 이미지. */
  imageUrl?: string | null;
  /** 현재시세 (JPY) — 시트의 자동 표시/직접뽑기 기준가. */
  currentPriceJpy?: number | null;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 카드 시세 상세 페이지의 액션 줄 — 모바일 PixelPress 와 동일 라벨/룩.
 * 컬렉션은 `/api/me/cards`, 관심은 `/api/me/favorites` 를 호출.
 * 마운트 시 둘 다 fetch 해서 이미 추가된 카드면 ✓ 표시.
 * 미로그인 시 클릭하면 `/login` 으로 이동.
 */
export function CardActions({ apparelId, cardName, imageUrl, currentPriceJpy }: Props) {
  const [favStatus, setFavStatus] = useState<Status>('idle');
  const [isFav, setIsFav] = useState<boolean>(false);
  const [isCollected, setIsCollected] = useState<boolean>(false);
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [authed, setAuthed] = useState<boolean>(true);
  const toast = useToast();

  // 마운트 시 컬렉션/관심 여부 확인 — 이미 추가된 카드면 즉시 ✓ 로 표시.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [favRes, cardRes] = await Promise.all([
          fetch('/api/me/favorites', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/me/cards', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (!alive) return;
        if (favRes.status === 401 || cardRes.status === 401) setAuthed(false);
        if (favRes.ok) {
          const j = (await favRes.json()) as { data?: Array<{ snkrdunkApparelId: number }> };
          setIsFav((j.data ?? []).some((row) => row.snkrdunkApparelId === apparelId));
        }
        if (cardRes.ok) {
          const j = (await cardRes.json()) as {
            data?: Array<{ snkrdunkApparelId: number | null }>;
          };
          setIsCollected((j.data ?? []).some((row) => row.snkrdunkApparelId === apparelId));
        }
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

  // 바로 추가하지 않고 "카드 등록" 시트를 띄운다 (구매가/직접뽑기/등급 입력).
  const openSheet = () => {
    if (!authed) {
      goLogin();
      return;
    }
    setSheetOpen(true);
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
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as
          | { error?: string; code?: string; message?: string }
          | null;
        const detail = body?.message || body?.code || body?.error || `HTTP ${r.status}`;
        throw new Error(detail);
      }
      setIsFav(wantOn);
      setFavStatus('done');
      toast.success(wantOn ? '관심카드에 추가되었습니다' : '관심카드에서 제거되었습니다');
      setTimeout(() => setFavStatus('idle'), 800);
    } catch (err) {
      setFavStatus('error');
      const msg = err instanceof Error ? err.message : '실패';
      toast.error(`관심카드 ${wantOn ? '추가' : '제거'} 실패: ${msg}`);
      setTimeout(() => setFavStatus('idle'), 1200);
    }
  };

  const collectDesc = isCollected ? '✓' : '추가';

  const favDesc =
    favStatus === 'loading' ? '...' : favStatus === 'error' ? '!' : isFav ? '✓' : '추가';

  return (
    <>
    {sheetOpen && (
      <div className="cv-sheet-overlay" onClick={() => setSheetOpen(false)}>
        <div className="cv-sheet-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cv-sheet-head">
            <span className="form-label" style={{ margin: 0 }}>＋ 카드 등록</span>
            <button type="button" className="cv-sheet-close" onClick={() => setSheetOpen(false)} aria-label="닫기">
              ✕
            </button>
          </div>
          <CardRegisterSheet
            card={{
              snkrdunkApparelId: apparelId,
              name: cardName ?? null,
              imageUrl: imageUrl ?? null,
              currentPriceJpy: currentPriceJpy ?? null,
            }}
            redirectOnSave={false}
            onSaved={() => {
              setIsCollected(true);
              toast.success('내 컬렉션에 등록되었습니다');
              setTimeout(() => setSheetOpen(false), 900);
            }}
          />
        </div>
      </div>
    )}
    <div className="snk-act-row">
      <button
        type="button"
        className="snk-act"
        onClick={openSheet}
        style={{ background: 'var(--blu)', color: 'var(--white)' }}
      >
        <span className="snk-act-icon" aria-hidden>{isCollected ? '✅' : '📦'}</span>
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
    </>
  );
}

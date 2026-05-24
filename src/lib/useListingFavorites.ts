'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

export type ListingSource = 'mvc' | 'bunjang';

export interface ListingFavorite {
  source: ListingSource;
  externalId: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  url: string;
  createdAt?: string;
}

/**
 * 외부 매물(MVC 경매 / 번개장터) 관심목록을 DB(사용자별)와 동기화하는 훅.
 * - 마운트 시 GET /api/me/listing-favorites?source= 로 목록 로드
 * - toggle: 추가 POST / 제거 DELETE, 401 이면 /login 으로
 * - favorites: createdAt desc 정렬된 관심목록 (최상단 고정 렌더용)
 */
export function useListingFavorites(source: ListingSource) {
  const [map, setMap] = useState<Record<string, ListingFavorite>>({});
  const [ready, setReady] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/me/listing-favorites?source=${source}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!alive) return;
        if (res.ok) {
          const j = (await res.json()) as { data?: ListingFavorite[] };
          const next: Record<string, ListingFavorite> = {};
          for (const f of j.data ?? []) next[String(f.externalId)] = f;
          setMap(next);
        }
      } catch {
        // 미로그인/오류 — 빈 상태로 둠
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [source]);

  const isFav = useCallback((externalId: string) => externalId in map, [map]);

  const toggle = useCallback(
    async (fav: ListingFavorite) => {
      const id = String(fav.externalId);
      const currentlyOn = id in map;
      // 낙관적 업데이트
      setMap((prev) => {
        const next = { ...prev };
        if (currentlyOn) delete next[id];
        else next[id] = { ...fav, source };
        return next;
      });
      try {
        const res = await fetch(
          currentlyOn
            ? `/api/me/listing-favorites/${source}/${encodeURIComponent(id)}`
            : '/api/me/listing-favorites',
          {
            method: currentlyOn ? 'DELETE' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: currentlyOn
              ? undefined
              : JSON.stringify({
                  source,
                  externalId: id,
                  title: fav.title,
                  imageUrl: fav.imageUrl,
                  price: fav.price,
                  url: fav.url,
                }),
          },
        );
        if (res.status === 401) {
          // 롤백 + 로그인 이동
          setMap((prev) => {
            const next = { ...prev };
            if (currentlyOn) next[id] = { ...fav, source };
            else delete next[id];
            return next;
          });
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success(currentlyOn ? '관심목록에서 제거했습니다' : '관심목록에 추가했습니다');
      } catch {
        // 실패 시 롤백
        setMap((prev) => {
          const next = { ...prev };
          if (currentlyOn) next[id] = { ...fav, source };
          else delete next[id];
          return next;
        });
        toast.error('관심목록 변경에 실패했습니다');
      }
    },
    [map, source, toast],
  );

  const favorites = Object.values(map).sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );

  return { isFav, toggle, favorites, ready };
}

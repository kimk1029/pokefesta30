import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/apiClient';
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
 * 외부 매물(MVC 경매 / 번개장터) 관심목록을 서버(사용자별)와 동기화하는 훅.
 * 웹 `src/lib/useListingFavorites.ts` 의 모바일 포팅 — 동일한 백엔드
 * `/api/me/listing-favorites` 를 [[apiClient]] (Bearer) 로 호출한다.
 * - 마운트 시 GET 로 목록 로드
 * - toggle: 추가 POST / 제거 DELETE (낙관적 업데이트, 실패 시 롤백), 401 이면 /login
 * - favorites: createdAt desc (최상단 고정 렌더용)
 */
export function useListingFavorites(source: ListingSource) {
  const [map, setMap] = useState<Record<string, ListingFavorite>>({});
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await api<{ data?: ListingFavorite[] }>(`/api/me/listing-favorites?source=${source}`);
        if (!alive) return;
        const next: Record<string, ListingFavorite> = {};
        for (const f of j?.data ?? []) next[String(f.externalId)] = f;
        setMap(next);
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
        if (currentlyOn) {
          await api(`/api/me/listing-favorites/${source}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } else {
          await api('/api/me/listing-favorites', {
            method: 'POST',
            body: {
              source,
              externalId: id,
              title: fav.title,
              imageUrl: fav.imageUrl,
              price: fav.price,
              url: fav.url,
            },
          });
        }
        toast.success(currentlyOn ? '관심목록에서 제거했습니다' : '관심목록에 추가했습니다');
      } catch (e) {
        // 실패 시 롤백
        setMap((prev) => {
          const next = { ...prev };
          if (currentlyOn) next[id] = { ...fav, source };
          else delete next[id];
          return next;
        });
        if (e instanceof ApiError && e.status === 401) {
          router.push('/login');
          return;
        }
        toast.error('관심목록 변경에 실패했습니다');
      }
    },
    [map, source, toast, router],
  );

  const favorites = Object.values(map).sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );

  return { isFav, toggle, favorites, ready };
}

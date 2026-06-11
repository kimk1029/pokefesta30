'use client';

import { useRouter } from 'next/navigation';
import { startRouteTransition } from '@/components/RouteProgress';

/**
 * 이벤트 게시판 글쓰기 아이콘 — 항상 노출.
 * 비로그인 사용자가 누르면 "로그인해주세요" 안내 후 로그인 페이지로.
 */
export function WriteEventButton({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const onClick = () => {
    if (!loggedIn) {
      alert('로그인해주세요');
      startRouteTransition();
      router.push('/login?callbackUrl=/events/write');
      return;
    }
    startRouteTransition();
    router.push('/events/write');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="이벤트 글쓰기"
      style={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 17,
      }}
    >
      ✏️
    </button>
  );
}

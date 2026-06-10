/**
 * 로그인 여부 구독 훅 — 세션 변경(로그인/로그아웃) 시 자동 리렌더.
 * (기존에 my.tsx / my/cards.tsx / my/favorites.tsx / index.tsx 에 복붙되어 있던
 *  훅의 공용 버전. 새 화면은 이걸 import 할 것.)
 */
import { useEffect, useState } from 'react';
import { isAuthenticated, subscribeSession } from '@/lib/session';

export function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => subscribeSession(() => setAuthed(isAuthenticated())), []);
  return authed;
}

'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_AVATAR, isAvatarId, type AvatarId } from './avatars';

const LS_KEY = 'pf30.avatar';

/**
 * 선택된 아바타 id 를 localStorage 에 영속화.
 * 서버렌더 직후 한 프레임은 DEFAULT_AVATAR → 로컬값으로 스왑.
 */
export function useAvatar(): {
  id: AvatarId;
  set: (id: AvatarId) => void;
} {
  const [id, setId] = useState<AvatarId>(DEFAULT_AVATAR);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw && isAvatarId(raw)) setId(raw);
    } catch {
      /* ignore */
    }
  }, []);
  const set = (next: AvatarId) => {
    setId(next);
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {
      /* ignore */
    }
  };
  return { id, set };
}

export function readAvatarSync(): AvatarId {
  if (typeof window === 'undefined') return DEFAULT_AVATAR;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw && isAvatarId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_AVATAR;
}

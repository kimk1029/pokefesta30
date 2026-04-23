'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  buyAvatar as buyAvatarAction,
  buyBackground as buyBgAction,
  buyFrame as buyFrameAction,
  pickAvatar as pickAvatarAction,
  pickBackground as pickBgAction,
  pickFrame as pickFrameAction,
} from '@/app/inventory-actions';
import { DEFAULT_AVATAR, DEFAULT_OWNED, type AvatarId } from '@/lib/avatars';
import type { InventorySnapshot } from '@/lib/queries';
import { DEFAULT_BG, DEFAULT_FRAME, type BackgroundId, type FrameId } from '@/lib/shop';

const ANON_SNAPSHOT: InventorySnapshot = {
  avatar: DEFAULT_AVATAR,
  avatarOwned: DEFAULT_OWNED,
  bg: DEFAULT_BG,
  bgOwned: [DEFAULT_BG],
  frame: DEFAULT_FRAME,
  frameOwned: [DEFAULT_FRAME],
  points: 0,
};

type MutResult = { ok: boolean; msg?: string };

export interface InventoryCtxValue extends InventorySnapshot {
  isLoggedIn: boolean;
  pickAvatar: (id: AvatarId) => Promise<MutResult>;
  pickBg: (id: BackgroundId) => Promise<MutResult>;
  pickFrame: (id: FrameId) => Promise<MutResult>;
  buyAvatar: (id: AvatarId, price: number) => Promise<MutResult>;
  buyBg: (id: BackgroundId, price: number) => Promise<MutResult>;
  buyFrame: (id: FrameId, price: number) => Promise<MutResult>;
}

const Ctx = createContext<InventoryCtxValue | null>(null);

export function InventoryProvider({
  initial,
  isLoggedIn,
  children,
}: {
  initial: InventorySnapshot | null;
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  const [snap, setSnap] = useState<InventorySnapshot>(initial ?? ANON_SNAPSHOT);

  const notLogged = useCallback((): MutResult => {
    return { ok: false, msg: '로그인이 필요합니다' };
  }, []);

  const wrap =
    <A extends unknown[]>(
      fn: (...args: A) => Promise<{ ok: true; inv: InventorySnapshot } | { ok: false; error: string }>,
    ) =>
    async (...args: A): Promise<MutResult> => {
      if (!isLoggedIn) return notLogged();
      const r = await fn(...args);
      if (r.ok) {
        setSnap(r.inv);
        return { ok: true };
      }
      return { ok: false, msg: r.error };
    };

  const value = useMemo<InventoryCtxValue>(
    () => ({
      ...snap,
      isLoggedIn,
      pickAvatar: wrap(pickAvatarAction),
      pickBg: wrap(pickBgAction),
      pickFrame: wrap(pickFrameAction),
      buyAvatar: wrap(buyAvatarAction),
      buyBg: wrap(buyBgAction),
      buyFrame: wrap(buyFrameAction),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap, isLoggedIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInventory(): InventoryCtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInventory must be inside InventoryProvider');
  return v;
}

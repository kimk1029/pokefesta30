'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from '@/lib/session';
import { DEFAULT_AVATAR, DEFAULT_OWNED, type AvatarId } from '@/lib/avatars';
import { DEFAULT_BG, DEFAULT_FRAME, type BackgroundId, type FrameId } from '@/lib/shop';

export interface InventorySnapshot {
  avatar: AvatarId;
  avatarOwned: AvatarId[];
  bg: BackgroundId;
  bgOwned: BackgroundId[];
  frame: FrameId;
  frameOwned: FrameId[];
  points: number;
}

const ANON_SNAPSHOT: InventorySnapshot = {
  avatar: DEFAULT_AVATAR,
  avatarOwned: DEFAULT_OWNED,
  bg: DEFAULT_BG,
  bgOwned: [DEFAULT_BG],
  frame: DEFAULT_FRAME,
  frameOwned: [DEFAULT_FRAME],
  points: 0,
};

type MutResult = { ok: boolean; msg?: string; retryInSec?: number };

export interface InventoryCtxValue extends InventorySnapshot {
  isLoggedIn: boolean;
  pickAvatar: (id: AvatarId) => Promise<MutResult>;
  pickBg: (id: BackgroundId) => Promise<MutResult>;
  pickFrame: (id: FrameId) => Promise<MutResult>;
  buyAvatar: (id: AvatarId, price: number) => Promise<MutResult>;
  buyBg: (id: BackgroundId, price: number) => Promise<MutResult>;
  buyFrame: (id: FrameId, price: number) => Promise<MutResult>;
  spend: (amount: number) => Promise<MutResult>;
  charge: (amount: number) => Promise<MutResult>;
  rewardAd: (slotId: string) => Promise<MutResult>;
}

const Ctx = createContext<InventoryCtxValue | null>(null);

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return (await r.json()) as T;
}

type BuyResponse =
  | { ok: true; inv: InventorySnapshot }
  | { ok: false; error: string; retryInSec?: number };

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const [snap, setSnap] = useState<InventorySnapshot>(ANON_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setSnap(ANON_SNAPSHOT);
      return;
    }
    fetch('/api/me/inventory', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { inventory?: InventorySnapshot } | null) => {
        if (!cancelled && data?.inventory) setSnap(data.inventory);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const notLogged = useCallback(
    (): MutResult => ({ ok: false, msg: '로그인이 필요합니다' }),
    [],
  );

  const apply = useCallback(
    async (path: string, body: unknown): Promise<MutResult> => {
      if (!isLoggedIn) return notLogged();
      try {
        const r = await postJson<BuyResponse>(path, body);
        if (r.ok) {
          setSnap(r.inv);
          return { ok: true };
        }
        return { ok: false, msg: r.error, retryInSec: r.retryInSec };
      } catch (e) {
        return { ok: false, msg: e instanceof Error ? e.message : 'network' };
      }
    },
    [isLoggedIn, notLogged],
  );

  const value = useMemo<InventoryCtxValue>(
    () => ({
      ...snap,
      isLoggedIn,
      pickAvatar: (id) => apply('/api/me/inventory/buy', { action: 'pick', kind: 'avatar', id }),
      pickBg: (id) => apply('/api/me/inventory/buy', { action: 'pick', kind: 'bg', id }),
      pickFrame: (id) => apply('/api/me/inventory/buy', { action: 'pick', kind: 'frame', id }),
      buyAvatar: (id, price) =>
        apply('/api/me/inventory/buy', { action: 'buy', kind: 'avatar', id, price }),
      buyBg: (id, price) =>
        apply('/api/me/inventory/buy', { action: 'buy', kind: 'bg', id, price }),
      buyFrame: (id, price) =>
        apply('/api/me/inventory/buy', { action: 'buy', kind: 'frame', id, price }),
      spend: (amount) => apply('/api/me/points/spend', { amount }),
      charge: async () => ({ ok: false, msg: '포인트 충전은 현재 중단되었습니다' }),
      rewardAd: async () => ({ ok: false, msg: '무료 광고 충전은 현재 중단되었습니다' }),
    }),
    [snap, isLoggedIn, apply],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInventory(): InventoryCtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInventory must be inside InventoryProvider');
  return v;
}

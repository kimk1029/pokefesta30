'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_AVATAR, DEFAULT_OWNED, isAvatarId, type AvatarId } from './avatars';
import { MY_PROFILE } from './data';
import {
  DEFAULT_BG,
  DEFAULT_FRAME,
  isBackgroundId,
  isFrameId,
  type BackgroundId,
  type FrameId,
} from './shop';

const K = {
  avatar: 'pf30.avatar',
  avatarOwned: 'pf30.avatar.owned',
  bg: 'pf30.bg',
  bgOwned: 'pf30.bg.owned',
  frame: 'pf30.frame',
  frameOwned: 'pf30.frame.owned',
  points: 'pf30.points',
};

function readArr<T extends string>(key: string, allow: (v: unknown) => v is T, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const set = new Set<T>(defaults);
    for (const v of parsed) if (allow(v)) set.add(v);
    return Array.from(set);
  } catch {
    return defaults;
  }
}

function readScalar<T extends string>(key: string, allow: (v: unknown) => v is T, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw && allow(raw)) return raw;
    return def;
  } catch {
    return def;
  }
}

export interface Inventory {
  avatar: AvatarId;
  avatarOwned: AvatarId[];
  bg: BackgroundId;
  bgOwned: BackgroundId[];
  frame: FrameId;
  frameOwned: FrameId[];
  points: number;
  /** 선택/구매 모두 이걸로. */
  pickAvatar: (id: AvatarId) => void;
  pickBg: (id: BackgroundId) => void;
  pickFrame: (id: FrameId) => void;
  buyAvatar: (id: AvatarId, price: number) => { ok: boolean; msg?: string };
  buyBg: (id: BackgroundId, price: number) => { ok: boolean; msg?: string };
  buyFrame: (id: FrameId, price: number) => { ok: boolean; msg?: string };
  /** 포인트 지급 (보상용). 음수 허용. */
  grantPoints: (amount: number) => void;
}

export function useInventory(): Inventory {
  const [avatar, setAvatar] = useState<AvatarId>(DEFAULT_AVATAR);
  const [avatarOwned, setAvatarOwned] = useState<AvatarId[]>(DEFAULT_OWNED);
  const [bg, setBg] = useState<BackgroundId>(DEFAULT_BG);
  const [bgOwned, setBgOwned] = useState<BackgroundId[]>([DEFAULT_BG]);
  const [frame, setFrame] = useState<FrameId>(DEFAULT_FRAME);
  const [frameOwned, setFrameOwned] = useState<FrameId[]>([DEFAULT_FRAME]);
  const [points, setPoints] = useState<number>(MY_PROFILE.points);

  useEffect(() => {
    setAvatar(readScalar(K.avatar, isAvatarId, DEFAULT_AVATAR));
    setAvatarOwned(readArr(K.avatarOwned, isAvatarId, DEFAULT_OWNED));
    setBg(readScalar(K.bg, isBackgroundId, DEFAULT_BG));
    setBgOwned(readArr(K.bgOwned, isBackgroundId, [DEFAULT_BG]));
    setFrame(readScalar(K.frame, isFrameId, DEFAULT_FRAME));
    setFrameOwned(readArr(K.frameOwned, isFrameId, [DEFAULT_FRAME]));
    try {
      const raw = localStorage.getItem(K.points);
      if (raw !== null && raw !== '') {
        const p = Number(raw);
        if (Number.isFinite(p)) setPoints(p);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  };

  const pickAvatar = useCallback((id: AvatarId) => {
    setAvatar(id);
    persist(K.avatar, id);
  }, []);
  const pickBg = useCallback((id: BackgroundId) => {
    setBg(id);
    persist(K.bg, id);
  }, []);
  const pickFrame = useCallback((id: FrameId) => {
    setFrame(id);
    persist(K.frame, id);
  }, []);

  const buyGeneric = <T extends string>(
    id: T,
    price: number,
    owned: T[],
    setOwned: (v: T[]) => void,
    ownedKey: string,
    pick: (v: T) => void,
  ): { ok: boolean; msg?: string } => {
    if (owned.includes(id)) {
      pick(id);
      return { ok: true };
    }
    if (points < price) return { ok: false, msg: '포인트가 부족해요' };
    const nextOwned = [...owned, id];
    setOwned(nextOwned);
    persist(ownedKey, JSON.stringify(nextOwned));
    const newPoints = points - price;
    setPoints(newPoints);
    persist(K.points, String(newPoints));
    pick(id);
    return { ok: true };
  };

  const buyAvatar = (id: AvatarId, price: number) =>
    buyGeneric(id, price, avatarOwned, setAvatarOwned, K.avatarOwned, pickAvatar);
  const buyBg = (id: BackgroundId, price: number) =>
    buyGeneric(id, price, bgOwned, setBgOwned, K.bgOwned, pickBg);
  const buyFrame = (id: FrameId, price: number) =>
    buyGeneric(id, price, frameOwned, setFrameOwned, K.frameOwned, pickFrame);

  const grantPoints = useCallback(
    (amount: number) => {
      setPoints((prev) => {
        const next = Math.max(0, prev + amount);
        persist(K.points, String(next));
        return next;
      });
    },
    [],
  );

  return {
    avatar,
    avatarOwned,
    bg,
    bgOwned,
    frame,
    frameOwned,
    points,
    pickAvatar,
    pickBg,
    pickFrame,
    buyAvatar,
    buyBg,
    buyFrame,
    grantPoints,
  };
}

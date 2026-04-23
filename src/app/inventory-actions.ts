'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AVATARS, isAvatarId, type AvatarId } from '@/lib/avatars';
import { prisma } from '@/lib/prisma';
import { getMyInventory, type InventorySnapshot } from '@/lib/queries';
import {
  BACKGROUNDS,
  FRAMES,
  isBackgroundId,
  isFrameId,
  type BackgroundId,
  type FrameId,
} from '@/lib/shop';

type Result =
  | { ok: true; inv: InventorySnapshot }
  | { ok: false; error: string };

async function sessionUserId(): Promise<string | null> {
  const s = await getServerSession(authOptions);
  const id = s?.user?.id;
  if (!id) return null;
  // ensure row exists (same as actions.ts ensureUser)
  await prisma.user.upsert({
    where: { id },
    update: { name: s.user.name ?? '트레이너' },
    create: { id, name: s.user.name ?? '트레이너' },
  });
  return id;
}

/* =========================
 * 선택 (pick)
 * ======================= */

export async function pickAvatar(id: string): Promise<Result> {
  if (!isAvatarId(id)) return { ok: false, error: 'invalid avatar' };
  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.ownedAvatars.includes(id)) return { ok: false, error: '보유하지 않은 아바타' };
  await prisma.user.update({ where: { id: userId }, data: { avatarId: id } });
  return { ok: true, inv: await getMyInventory(userId) };
}

export async function pickBackground(id: string): Promise<Result> {
  if (!isBackgroundId(id)) return { ok: false, error: 'invalid background' };
  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.ownedBackgrounds.includes(id)) return { ok: false, error: '보유하지 않은 배경' };
  await prisma.user.update({ where: { id: userId }, data: { backgroundId: id } });
  return { ok: true, inv: await getMyInventory(userId) };
}

export async function pickFrame(id: string): Promise<Result> {
  if (!isFrameId(id)) return { ok: false, error: 'invalid frame' };
  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.ownedFrames.includes(id)) return { ok: false, error: '보유하지 않은 테두리' };
  await prisma.user.update({ where: { id: userId }, data: { frameId: id } });
  return { ok: true, inv: await getMyInventory(userId) };
}

/* =========================
 * 구매 (buy)
 * ======================= */

async function genericBuy(
  userId: string,
  kind: 'avatar' | 'bg' | 'frame',
  id: string,
  expectedPrice: number,
): Promise<Result> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return { ok: false, error: 'user not found' };

  const ownedField =
    kind === 'avatar' ? 'ownedAvatars' : kind === 'bg' ? 'ownedBackgrounds' : 'ownedFrames';
  const currentField = kind === 'avatar' ? 'avatarId' : kind === 'bg' ? 'backgroundId' : 'frameId';
  const owned = u[ownedField] as string[];

  if (owned.includes(id)) {
    // 이미 보유 — 선택만
    await prisma.user.update({ where: { id: userId }, data: { [currentField]: id } });
    return { ok: true, inv: await getMyInventory(userId) };
  }

  if (u.points < expectedPrice) return { ok: false, error: '포인트 부족' };

  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { decrement: expectedPrice },
      [currentField]: id,
      [ownedField]: { push: id },
    },
  });
  return { ok: true, inv: await getMyInventory(userId) };
}

export async function buyAvatar(id: string, expectedPrice: number): Promise<Result> {
  if (!isAvatarId(id)) return { ok: false, error: 'invalid avatar' };
  const meta = AVATARS.find((a) => a.id === id);
  if (!meta) return { ok: false, error: 'invalid avatar' };

  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };

  // 레벨 모드는 보상(무료 해제)
  if (meta.mode === 'level') {
    // TODO: user.level 비교 로직. 현재는 level 필드가 User 모델에 없어서 mock 통과
    return genericBuy(userId, 'avatar', id, 0);
  }
  // shop 모드 — 등록된 가격과 일치 검증 (요청 변조 방지)
  if (meta.mode === 'shop' && meta.price !== expectedPrice) {
    return { ok: false, error: 'price mismatch' };
  }
  if (meta.mode === 'free') {
    // 기본 제공 — 보유에 없으면 추가만
    return genericBuy(userId, 'avatar', id, 0);
  }
  return genericBuy(userId, 'avatar', id as AvatarId, expectedPrice);
}

export async function buyBackground(id: string, expectedPrice: number): Promise<Result> {
  if (!isBackgroundId(id)) return { ok: false, error: 'invalid background' };
  const meta = BACKGROUNDS.find((b) => b.id === id);
  if (!meta || meta.price !== expectedPrice) return { ok: false, error: 'price mismatch' };

  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  return genericBuy(userId, 'bg', id as BackgroundId, expectedPrice);
}

/**
 * 임의 포인트 차감 (오리파 뽑기 등). 서버 검증으로 잔액 부족 방지.
 */
export async function spendPoints(amount: number): Promise<Result> {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'invalid amount' };
  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return { ok: false, error: 'user not found' };
  if (u.points < amount) return { ok: false, error: '포인트 부족' };
  await prisma.user.update({
    where: { id: userId },
    data: { points: { decrement: amount } },
  });
  return { ok: true, inv: await getMyInventory(userId) };
}

export async function buyFrame(id: string, expectedPrice: number): Promise<Result> {
  if (!isFrameId(id)) return { ok: false, error: 'invalid frame' };
  const meta = FRAMES.find((f) => f.id === id);
  if (!meta || meta.price !== expectedPrice) return { ok: false, error: 'price mismatch' };

  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  return genericBuy(userId, 'frame', id as FrameId, expectedPrice);
}

'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AVATARS, isAvatarId, type AvatarId } from '@/lib/avatars';
import { defaultNameFor } from '@/lib/defaultName';
import { prisma } from '@/lib/prisma';
import { getMyInventory, type InventorySnapshot } from '@/lib/queries';
import { getSlot } from '@/lib/freeCharge';
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
  // ensure row exists — 커스텀 이름 보존을 위해 update 는 비움
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, name: defaultNameFor(id) },
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
 * 결제 mock — 사업자 등록 전까지 실제 결제 없이 포인트 가상 충전.
 * 실제 결제 붙일 때 이 액션 내부를 PG 검증으로 교체.
 */
export async function mockCharge(amount: number): Promise<Result> {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'invalid amount' };
  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });
  return { ok: true, inv: await getMyInventory(userId) };
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

/**
 * 무료충전소 — 광고 시청 보상.
 * 서버 메모리 기반 cooldown/daily 제한. (재시작 시 초기화 — mock 단계 허용)
 * 실제 SDK 연동 시 콜백 서명검증으로 교체.
 */
type AdViewState = { lastAt: number; dayKey: string; count: number };
const adViewStore = new Map<string, AdViewState>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function rewardAdView(
  slotId: string,
): Promise<Result | { ok: false; error: string; retryInSec?: number }> {
  const slot = getSlot(slotId);
  if (!slot) return { ok: false, error: 'invalid slot' };

  const userId = await sessionUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };

  const key = `${userId}:${slotId}`;
  const now = Date.now();
  const day = todayKey();
  const prev = adViewStore.get(key);

  if (prev && prev.dayKey === day) {
    const elapsed = (now - prev.lastAt) / 1000;
    if (elapsed < slot.cooldownSec) {
      return {
        ok: false,
        error: '쿨다운 중',
        retryInSec: Math.ceil(slot.cooldownSec - elapsed),
      };
    }
    if (prev.count >= slot.dailyLimit) {
      return { ok: false, error: '오늘 한도 초과' };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: slot.reward } },
  });

  const nextCount = prev && prev.dayKey === day ? prev.count + 1 : 1;
  adViewStore.set(key, { lastAt: now, dayKey: day, count: nextCount });

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

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { CongestionLevel, TradeType } from '@/lib/types';

const LEVELS: readonly CongestionLevel[] = ['empty', 'normal', 'busy', 'full'] as const;
const TRADE_TYPES: readonly TradeType[] = ['buy', 'sell'] as const;

/* ============================================================
 * Report (제보)
 * ========================================================== */
export async function submitReport(formData: FormData): Promise<void> {
  const placeId = String(formData.get('place_id') ?? '');
  const rawLevel = String(formData.get('level') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!placeId) throw new Error('place_id required');
  if (!LEVELS.includes(rawLevel as CongestionLevel)) {
    throw new Error(`invalid level: ${rawLevel}`);
  }
  const level = rawLevel as CongestionLevel;

  await prisma.$transaction(async (tx) => {
    await tx.report.create({
      data: { placeId, level, note },
    });
    await tx.place.update({
      where: { id: placeId },
      data: {
        level,
        lastReportAt: new Date(),
        count: { increment: 1 },
      },
    });
  });

  revalidatePath('/live');
  revalidatePath('/');
  redirect('/live');
}

/* ============================================================
 * Trade (거래글 작성)
 * ========================================================== */
export async function submitTrade(formData: FormData): Promise<void> {
  const placeId = String(formData.get('place_id') ?? '');
  const rawType = String(formData.get('type') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const price = String(formData.get('price') ?? '').trim() || '제안';

  if (!placeId) throw new Error('place_id required');
  if (!TRADE_TYPES.includes(rawType as TradeType)) {
    throw new Error(`invalid type: ${rawType}`);
  }
  if (!title) throw new Error('title required');

  await prisma.trade.create({
    data: {
      placeId,
      type: rawType,
      title,
      body,
      price,
    },
  });

  revalidatePath('/trade');
  revalidatePath('/');
  redirect('/trade');
}

/* ============================================================
 * Feed (잡담)
 * ========================================================== */
export async function submitFeed(formData: FormData): Promise<void> {
  const placeIdRaw = String(formData.get('place_id') ?? '').trim();
  const text = String(formData.get('text') ?? '').trim();

  if (!text) throw new Error('text required');

  await prisma.feed.create({
    data: {
      placeId: placeIdRaw || null,
      text,
    },
  });

  revalidatePath('/feed');
  revalidatePath('/');
  redirect('/feed');
}

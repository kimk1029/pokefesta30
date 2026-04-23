'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { CongestionLevel, FeedKind, TradeType } from '@/lib/types';

const LEVELS: readonly CongestionLevel[] = ['empty', 'normal', 'busy', 'full'] as const;
const TRADE_TYPES: readonly TradeType[] = ['buy', 'sell'] as const;
const FEED_KINDS: readonly FeedKind[] = ['general', 'report'] as const;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('로그인이 필요합니다');
  return session;
}

function authorEmojiFrom(session: Awaited<ReturnType<typeof requireSession>>): string {
  return session.user.name?.slice(0, 2) ?? '🐣';
}

/* ============================================================
 * Feed — 통합 작성 (일반 + 제보)
 *   form fields:
 *     kind: 'general' | 'report'
 *     place_id?: string
 *     level?: CongestionLevel  (kind=report 필수)
 *     text: string
 * ========================================================== */
export async function submitFeed(formData: FormData): Promise<void> {
  const session = await requireSession();

  const kindRaw = String(formData.get('kind') ?? 'general');
  if (!FEED_KINDS.includes(kindRaw as FeedKind)) {
    throw new Error(`invalid kind: ${kindRaw}`);
  }
  const kind = kindRaw as FeedKind;
  const placeIdRaw = String(formData.get('place_id') ?? '').trim();
  const placeId = placeIdRaw || null;
  const text = String(formData.get('text') ?? '').trim();
  if (!text) throw new Error('text required');

  let level: CongestionLevel | null = null;
  if (kind === 'report') {
    const rawLevel = String(formData.get('level') ?? '');
    if (!LEVELS.includes(rawLevel as CongestionLevel)) {
      throw new Error(`invalid level: ${rawLevel}`);
    }
    if (!placeId) throw new Error('place_id required for report');
    level = rawLevel as CongestionLevel;
  }

  await prisma.$transaction(async (tx) => {
    await tx.feed.create({
      data: {
        kind,
        level,
        placeId,
        text,
        authorId: session.user.id ?? null,
        authorEmoji: authorEmojiFrom(session),
      },
    });
    if (kind === 'report' && placeId && level) {
      await tx.place.update({
        where: { id: placeId },
        data: { level, lastReportAt: new Date(), count: { increment: 1 } },
      });
    }
  });

  revalidatePath('/feed');
  revalidatePath('/live');
  revalidatePath('/');
  redirect('/feed');
}

/**
 * 구 호환 — submitReport 는 submitFeed(kind=report) 로 내부 위임.
 * WriteScreen 'report' 모드에서 아직 사용 가능.
 */
export async function submitReport(formData: FormData): Promise<void> {
  formData.set('kind', 'report');
  const note = formData.get('note');
  if (note !== null && !formData.get('text')) {
    formData.set('text', String(note));
  }
  return submitFeed(formData);
}

/* ============================================================
 * Trade
 * ========================================================== */
export async function submitTrade(formData: FormData): Promise<void> {
  const session = await requireSession();

  const placeId = String(formData.get('place_id') ?? '');
  const rawType = String(formData.get('type') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const price = String(formData.get('price') ?? '').trim() || '제안';
  const kakaoId = String(formData.get('kakao_id') ?? '').trim() || null;

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
      kakaoId,
      authorId: session.user.id ?? null,
      authorEmoji: authorEmojiFrom(session),
    },
  });

  revalidatePath('/trade');
  revalidatePath('/');
  redirect('/trade');
}

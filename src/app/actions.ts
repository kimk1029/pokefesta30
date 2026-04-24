'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAvatarId } from '@/lib/avatars';
import { defaultNameFor } from '@/lib/defaultName';
import { prisma } from '@/lib/prisma';
import { REWARDS } from '@/lib/rewards';
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

/**
 * NextAuth 세션 user 를 users 테이블에 upsert 해서 FK 안전하게 만듬.
 * JWT 세션이라 token.sub(provider-scoped id)를 PK 로 사용.
 */
async function ensureUser(
  session: Awaited<ReturnType<typeof requireSession>>,
): Promise<string | null> {
  const id = session.user.id;
  if (!id) return null;
  try {
    await prisma.user.upsert({
      where: { id },
      update: {}, // name 은 /api/me/name 으로만 변경. 자동 upsert 가 커스텀 이름 덮지 않도록.
      create: { id, name: defaultNameFor(id), avatar: '🐣' },
    });
    return id;
  } catch (err) {
    console.error('[ensureUser] upsert 실패:', err);
    return null;
  }
}

/** form 의 avatar_id 필드 우선, 없으면 이모지 폴백. */
function authorTokenFromForm(
  formData: FormData,
  session: Awaited<ReturnType<typeof requireSession>>,
): string {
  const raw = String(formData.get('avatar_id') ?? '').trim();
  if (raw && isAvatarId(raw)) return raw;
  return authorEmojiFrom(session);
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

  const authorId = await ensureUser(session);
  const authorEmoji = authorTokenFromForm(formData, session);
  const reward = kind === 'report' ? REWARDS.feed_report : REWARDS.feed_general;

  // 작성 시점의 배경/테두리 스냅샷 (author 인벤토리 기준)
  let snapBg = 'default';
  let snapFrame = 'none';
  if (authorId) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: authorId },
        select: { backgroundId: true, frameId: true },
      });
      if (u) {
        snapBg = u.backgroundId;
        snapFrame = u.frameId;
      }
    } catch (err) {
      console.error('[submitFeed] 스냅샷 쿼리 실패 (컬럼 없음 가능):', err);
      // 기본값 유지하고 계속 진행
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.feed.create({
        data: {
          kind,
          level,
          placeId,
          text,
          authorId,
          authorEmoji,
          authorBgId: snapBg,
          authorFrameId: snapFrame,
        },
      });
      if (kind === 'report' && placeId && level) {
        await tx.place.update({
          where: { id: placeId },
          data: { level, lastReportAt: new Date(), count: { increment: 1 } },
        });
      }
      if (authorId) {
        await tx.user.update({
          where: { id: authorId },
          data: { points: { increment: reward } },
        });
      }
    });
  } catch (err) {
    console.error('[submitFeed] transaction failed:', err);
    throw new Error(
      err instanceof Error ? `등록 실패: ${err.message.slice(0, 140)}` : '등록 실패',
    );
  }

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

  const authorId = await ensureUser(session);
  let snapBg = 'default';
  let snapFrame = 'none';
  if (authorId) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: authorId },
        select: { backgroundId: true, frameId: true },
      });
      if (u) {
        snapBg = u.backgroundId;
        snapFrame = u.frameId;
      }
    } catch (err) {
      console.error('[submitTrade] 스냅샷 쿼리 실패:', err);
    }
  }

  try {
  await prisma.$transaction(async (tx) => {
    await tx.trade.create({
      data: {
        placeId,
        type: rawType,
        title,
        body,
        price,
        kakaoId,
        authorId,
        authorEmoji: authorTokenFromForm(formData, session),
        authorBgId: snapBg,
        authorFrameId: snapFrame,
        bumpedAt: new Date(), // 최신 거래가 목록 최상단에 보이도록
      },
    });
    if (authorId) {
      await tx.user.update({
        where: { id: authorId },
        data: { points: { increment: REWARDS.trade_post } },
      });
    }
  });
  } catch (err) {
    console.error('[submitTrade] transaction failed:', err);
    throw new Error(
      err instanceof Error ? `등록 실패: ${err.message.slice(0, 140)}` : '등록 실패',
    );
  }

  revalidatePath('/trade');
  revalidatePath('/');
  redirect('/trade');
}

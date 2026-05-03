import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { defaultNameFor } from '@/lib/defaultName';
import { findCardEntry } from '@/lib/cardsCatalog';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/me/cards — 내가 저장한 카드 목록 (최신순) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const rows = await prisma.userCard.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ data: rows });
}

/**
 * POST /api/me/cards — 그레이딩 결과를 내 카드에 저장
 * body: { cardId?, ocrSetCode?, ocrCardNumber?, nickname?, memo?, gradeEstimate?, centeringScore?, photoUrl? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const cardIdRaw = typeof body.cardId === 'string' ? body.cardId.trim() : '';
  const cardId = cardIdRaw && findCardEntry(cardIdRaw) ? cardIdRaw : null;
  const ocrSetCode = typeof body.ocrSetCode === 'string' ? body.ocrSetCode.trim().slice(0, 16) : null;
  const ocrCardNumber = typeof body.ocrCardNumber === 'string' ? body.ocrCardNumber.trim().slice(0, 16) : null;

  // 카탈로그 매칭도 안 되고 OCR 단서도 없으면 거부 — 빈 row 누적 방지
  if (!cardId && !ocrSetCode && !ocrCardNumber) {
    return NextResponse.json({ error: 'cardId 또는 OCR 식별자 중 하나는 필요해요' }, { status: 400 });
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 60) : null;
  const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 500) : null;
  const gradeEstimate = typeof body.gradeEstimate === 'string' ? body.gradeEstimate.trim().slice(0, 60) : null;
  const centeringScore = typeof body.centeringScore === 'number' && Number.isFinite(body.centeringScore)
    ? Math.max(0, Math.min(100, body.centeringScore))
    : null;
  const photoUrl = typeof body.photoUrl === 'string' && /^https?:\/\//.test(body.photoUrl)
    ? body.photoUrl.slice(0, 500)
    : null;

  // FK 안전 — users 행 보장
  await prisma.user.upsert({
    where: { id: session.user.id },
    update: {},
    create: { id: session.user.id, name: defaultNameFor(session.user.id) },
  });

  const created = await prisma.userCard.create({
    data: {
      userId: session.user.id,
      cardId,
      ocrSetCode,
      ocrCardNumber,
      nickname,
      memo,
      gradeEstimate,
      centeringScore,
      photoUrl,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

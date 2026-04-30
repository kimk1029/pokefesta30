import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SLIDE_CLASSES = ['slide-a', 'slide-b', 'slide-c', 'slide-d'] as const;
const VISUAL_TYPES = ['emoji', 'image'] as const;
const ON_CLICKS = ['stamp-rally', 'oripa'] as const;

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

interface BannerPatch {
  sortOrder?: number;
  slideClass?: string;
  badge?: string;
  title?: string;
  sub?: string;
  ctaHint?: string | null;
  visualType?: string;
  visualValue?: string;
  onClick?: string | null;
  active?: boolean;
}

function buildUpdate(input: BannerPatch): { ok: true; data: Prisma.HeroBannerUpdateInput } | { ok: false; error: string } {
  const data: Prisma.HeroBannerUpdateInput = {};

  if (input.slideClass !== undefined) {
    if (!SLIDE_CLASSES.includes(input.slideClass as typeof SLIDE_CLASSES[number])) {
      return { ok: false, error: `slideClass must be one of ${SLIDE_CLASSES.join(',')}` };
    }
    data.slideClass = input.slideClass;
  }
  if (input.badge !== undefined) {
    if (typeof input.badge !== 'string' || !input.badge.trim()) return { ok: false, error: 'badge required' };
    data.badge = input.badge;
  }
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim()) return { ok: false, error: 'title required' };
    data.title = input.title;
  }
  if (input.sub !== undefined) {
    if (typeof input.sub !== 'string' || !input.sub.trim()) return { ok: false, error: 'sub required' };
    data.sub = input.sub;
  }
  if (input.ctaHint !== undefined) data.ctaHint = input.ctaHint || null;
  if (input.visualType !== undefined) {
    if (!VISUAL_TYPES.includes(input.visualType as typeof VISUAL_TYPES[number])) {
      return { ok: false, error: `visualType must be one of ${VISUAL_TYPES.join(',')}` };
    }
    data.visualType = input.visualType;
  }
  if (input.visualValue !== undefined) {
    if (typeof input.visualValue !== 'string' || !input.visualValue.trim()) {
      return { ok: false, error: 'visualValue required' };
    }
    data.visualValue = input.visualValue;
  }
  if (input.onClick !== undefined) {
    if (input.onClick === null || input.onClick === '') {
      data.onClick = null;
    } else if (!ON_CLICKS.includes(input.onClick as typeof ON_CLICKS[number])) {
      return { ok: false, error: `onClick must be null or one of ${ON_CLICKS.join(',')}` };
    } else {
      data.onClick = input.onClick;
    }
  }
  if (input.sortOrder !== undefined) {
    const n = Number(input.sortOrder);
    if (!Number.isFinite(n)) return { ok: false, error: 'sortOrder must be a number' };
    data.sortOrder = Math.trunc(n);
  }
  if (input.active !== undefined) data.active = !!input.active;

  return { ok: true, data };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const banner = await prisma.heroBanner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ banner });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: BannerPatch;
  try {
    body = (await req.json()) as BannerPatch;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const built = buildUpdate(body);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  try {
    const updated = await prisma.heroBanner.update({ where: { id }, data: built.data });
    return NextResponse.json({ banner: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  try {
    await prisma.heroBanner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}

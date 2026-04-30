import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SLIDE_CLASSES = ['slide-a', 'slide-b', 'slide-c', 'slide-d'] as const;
const VISUAL_TYPES = ['emoji', 'image'] as const;
const ON_CLICKS = ['stamp-rally', 'oripa'] as const;

interface BannerInput {
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

function validate(input: BannerInput, partial: boolean): { ok: true; data: BannerInput } | { ok: false; error: string } {
  const out: BannerInput = {};

  if (input.slideClass !== undefined) {
    if (!SLIDE_CLASSES.includes(input.slideClass as typeof SLIDE_CLASSES[number])) {
      return { ok: false, error: `slideClass must be one of ${SLIDE_CLASSES.join(',')}` };
    }
    out.slideClass = input.slideClass;
  } else if (!partial) {
    return { ok: false, error: 'slideClass is required' };
  }

  if (input.badge !== undefined) {
    if (typeof input.badge !== 'string' || !input.badge.trim()) return { ok: false, error: 'badge required' };
    out.badge = input.badge;
  } else if (!partial) return { ok: false, error: 'badge required' };

  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim()) return { ok: false, error: 'title required' };
    out.title = input.title;
  } else if (!partial) return { ok: false, error: 'title required' };

  if (input.sub !== undefined) {
    if (typeof input.sub !== 'string' || !input.sub.trim()) return { ok: false, error: 'sub required' };
    out.sub = input.sub;
  } else if (!partial) return { ok: false, error: 'sub required' };

  if (input.ctaHint !== undefined) out.ctaHint = input.ctaHint || null;

  if (input.visualType !== undefined) {
    if (!VISUAL_TYPES.includes(input.visualType as typeof VISUAL_TYPES[number])) {
      return { ok: false, error: `visualType must be one of ${VISUAL_TYPES.join(',')}` };
    }
    out.visualType = input.visualType;
  } else if (!partial) out.visualType = 'emoji';

  if (input.visualValue !== undefined) {
    if (typeof input.visualValue !== 'string' || !input.visualValue.trim()) {
      return { ok: false, error: 'visualValue required' };
    }
    out.visualValue = input.visualValue;
  } else if (!partial) out.visualValue = '✨';

  if (input.onClick !== undefined) {
    if (input.onClick === null || input.onClick === '') {
      out.onClick = null;
    } else if (!ON_CLICKS.includes(input.onClick as typeof ON_CLICKS[number])) {
      return { ok: false, error: `onClick must be null or one of ${ON_CLICKS.join(',')}` };
    } else {
      out.onClick = input.onClick;
    }
  }

  if (input.sortOrder !== undefined) {
    const n = Number(input.sortOrder);
    if (!Number.isFinite(n)) return { ok: false, error: 'sortOrder must be a number' };
    out.sortOrder = Math.trunc(n);
  } else if (!partial) out.sortOrder = 0;

  if (input.active !== undefined) out.active = !!input.active;
  else if (!partial) out.active = true;

  return { ok: true, data: out };
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const banners = await prisma.heroBanner.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: BannerInput;
  try {
    body = (await req.json()) as BannerInput;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const v = validate(body, false);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const created = await prisma.heroBanner.create({
    data: {
      sortOrder: v.data.sortOrder ?? 0,
      slideClass: v.data.slideClass!,
      badge: v.data.badge!,
      title: v.data.title!,
      sub: v.data.sub!,
      ctaHint: v.data.ctaHint ?? null,
      visualType: v.data.visualType ?? 'emoji',
      visualValue: v.data.visualValue ?? '✨',
      onClick: v.data.onClick ?? null,
      active: v.data.active ?? true,
    },
  });
  return NextResponse.json({ banner: created }, { status: 201 });
}

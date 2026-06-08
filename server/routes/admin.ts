import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { put } from '@vercel/blob';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const SLIDE_CLASSES = ['slide-a', 'slide-b', 'slide-c', 'slide-d'] as const;
const VISUAL_TYPES = ['emoji', 'image'] as const;
const ON_CLICKS = ['stamp-rally', 'oripa'] as const;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

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
  linkUrl?: string | null;
  active?: boolean;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validateBanner(
  input: BannerInput,
  partial: boolean,
): { ok: true; data: BannerInput } | { ok: false; error: string } {
  const out: BannerInput = {};
  if (input.slideClass !== undefined) {
    if (!(SLIDE_CLASSES as readonly string[]).includes(input.slideClass)) {
      return { ok: false, error: `slideClass must be one of ${SLIDE_CLASSES.join(',')}` };
    }
    out.slideClass = input.slideClass;
  } else if (!partial) return { ok: false, error: 'slideClass is required' };

  if (input.badge !== undefined) {
    if (typeof input.badge !== 'string' || !input.badge.trim()) {
      return { ok: false, error: 'badge required' };
    }
    out.badge = input.badge;
  } else if (!partial) return { ok: false, error: 'badge required' };

  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim()) {
      return { ok: false, error: 'title required' };
    }
    out.title = input.title;
  } else if (!partial) return { ok: false, error: 'title required' };

  if (input.sub !== undefined) {
    if (typeof input.sub !== 'string' || !input.sub.trim()) {
      return { ok: false, error: 'sub required' };
    }
    out.sub = input.sub;
  } else if (!partial) return { ok: false, error: 'sub required' };

  if (input.ctaHint !== undefined) out.ctaHint = input.ctaHint || null;

  if (input.visualType !== undefined) {
    if (!(VISUAL_TYPES as readonly string[]).includes(input.visualType)) {
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
    if (input.onClick === null || input.onClick === '') out.onClick = null;
    else if (!(ON_CLICKS as readonly string[]).includes(input.onClick)) {
      return { ok: false, error: `onClick must be null or one of ${ON_CLICKS.join(',')}` };
    } else out.onClick = input.onClick;
  }

  if (input.linkUrl !== undefined) {
    if (input.linkUrl === null || input.linkUrl === '') out.linkUrl = null;
    else if (typeof input.linkUrl !== 'string') {
      return { ok: false, error: 'linkUrl must be a string' };
    } else {
      const trimmed = input.linkUrl.trim();
      // 내부 경로('/...') 또는 http(s) URL 만 허용. 그 외(javascript: 등)는 거부.
      if (!/^\/(?!\/)/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
        return { ok: false, error: "linkUrl must start with '/' or 'http(s)://'" };
      }
      out.linkUrl = trimmed;
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

const router = Router();
router.use(requireAdmin);

router.get('/banners', async (_req: Request, res: Response) => {
  try {
    const banners = await prisma.heroBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    res.json({ banners });
  } catch (err) {
    console.error('[admin.banners.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/banners', async (req: Request, res: Response) => {
  const v = validateBanner((req.body ?? {}) as BannerInput, false);
  if (v.ok === false) return res.status(400).json({ error: v.error });
  try {
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
        linkUrl: v.data.linkUrl ?? null,
        active: v.data.active ?? true,
      },
    });
    res.status(201).json({ banner: created });
  } catch (err) {
    console.error('[admin.banners.POST]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/banners/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  try {
    const banner = await prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) return res.status(404).json({ error: 'not found' });
    res.json({ banner });
  } catch (err) {
    console.error('[admin.banners.GET id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/banners/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  const v = validateBanner((req.body ?? {}) as BannerInput, true);
  if (v.ok === false) return res.status(400).json({ error: v.error });
  try {
    const updated = await prisma.heroBanner.update({
      where: { id },
      data: v.data as Prisma.HeroBannerUpdateInput,
    });
    res.json({ banner: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'not found' });
    }
    console.error('[admin.banners.PATCH]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/banners/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  try {
    await prisma.heroBanner.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'not found' });
    }
    console.error('[admin.banners.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

/* ------------------------------------------------------------------ */
/* banner image upload — Vercel Blob (admin only)                      */
/* ------------------------------------------------------------------ */
const BANNER_IMG_MAX_BYTES = 4 * 1024 * 1024;
const BANNER_IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BANNER_IMG_MAX_BYTES },
});

function bannerExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

router.post('/banners/upload', bannerUpload.single('file'), async (req: Request, res: Response) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'Vercel Blob 이 설정되지 않았습니다. Vercel → Storage → Blob store 생성 후 연결 필요.',
    });
  }
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'no file' });
  if (!BANNER_IMG_TYPES.has(file.mimetype)) {
    return res.status(400).json({ error: `지원하지 않는 형식: ${file.mimetype}` });
  }
  try {
    const pathname = `banner/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${bannerExt(file.mimetype)}`;
    const { url } = await put(pathname, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    res.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin.banners.upload]', msg);
    res.status(500).json({ error: msg });
  }
});

router.get('/oripa-tickets', async (req: Request, res: Response) => {
  const limit = Math.min(
    Math.max(Number(req.query.limit ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const cursorRaw = typeof req.query.cursor === 'string' ? req.query.cursor : null;
  const cursor = cursorRaw ? Number(cursorRaw) : null;
  const packId = typeof req.query.packId === 'string' ? req.query.packId : undefined;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

  const where = {
    drawn: true,
    ...(packId ? { packId } : {}),
    ...(userId ? { drawnById: userId } : {}),
  };
  try {
    const rows = await prisma.oripaTicket.findMany({
      where,
      orderBy: [{ drawnAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && Number.isInteger(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        packId: true,
        index: true,
        grade: true,
        prizeName: true,
        prizeEmoji: true,
        prizeImageUrl: true,
        drawnAt: true,
        drawnById: true,
        drawnByName: true,
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const packIds = Array.from(new Set(items.map((r) => r.packId)));
    const packs = packIds.length
      ? await prisma.oripaPack.findMany({
          where: { id: { in: packIds } },
          select: { id: true, name: true, emoji: true, price: true },
        })
      : [];
    const packMap = new Map<string, { name: string; emoji: string; price: number }>(
      packs.map((p) => [p.id, p]),
    );
    res.json({
      items: items.map((r) => ({
        id: r.id,
        packId: r.packId,
        packName: packMap.get(r.packId)?.name ?? r.packId,
        packEmoji: packMap.get(r.packId)?.emoji ?? '🎁',
        packPrice: packMap.get(r.packId)?.price ?? null,
        index: r.index,
        grade: r.grade,
        prizeName: r.prizeName,
        prizeEmoji: r.prizeEmoji,
        prizeImageUrl: r.prizeImageUrl,
        drawnAt: r.drawnAt,
        drawnById: r.drawnById,
        drawnByName: r.drawnByName,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('[admin.oripa-tickets]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        streakCount: true,
        lastCheckInAt: true,
        avatarId: true,
        backgroundId: true,
        frameId: true,
        ownedAvatars: true,
        ownedBackgrounds: true,
        ownedFrames: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!u) return res.status(404).json({ error: 'not found' });
    const [feedTotal, tradeCount, ticketCount, sentMsg, recvMsg, cardCount] = await Promise.all([
      prisma.feed.count({ where: { authorId: id } }),
      prisma.trade.count({ where: { authorId: id } }),
      prisma.oripaTicket.count({ where: { drawnById: id } }),
      prisma.message.count({ where: { senderId: id } }),
      prisma.message.count({ where: { receiverId: id } }),
      prisma.userCard.count({ where: { userId: id } }),
    ]);
    res.json({
      user: {
        ...u,
        counts: { feedTotal, tradeCount, ticketCount, sentMsg, recvMsg, cardCount },
      },
    });
  } catch (err) {
    console.error('[admin.users.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

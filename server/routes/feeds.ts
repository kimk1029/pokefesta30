import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { defaultNameFor } from '../lib/defaultName.js';
import { getFeedPage } from '../lib/queries.js';
import { REWARDS } from '@/lib/rewards';

const router = Router();

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get('/', async (req: Request, res: Response) => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
  const limitRaw = Number(req.query.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  const page = await getFeedPage({ cursor, limit });
  res.json(page);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    text?: string;
    avatarId?: string;
    images?: string[];
  };
  const text = body.text?.trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  const images = Array.isArray(body.images)
    ? body.images.filter((u): u is string => typeof u === 'string' && u.length > 0).slice(0, 3)
    : [];
  const userId = req.user!.userId;
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const u = await prisma.user
      .findUnique({ where: { id: userId }, select: { backgroundId: true, frameId: true } })
      .catch(() => null);
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.feed.create({
        data: {
          text,
          authorId: userId,
          authorEmoji: body.avatarId ?? req.user!.name?.slice(0, 2) ?? '🐣',
          authorBgId: u?.backgroundId ?? 'default',
          authorFrameId: u?.frameId ?? 'none',
          images: images.length > 0 ? images : undefined,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: REWARDS.feed_general } },
      });
      return row;
    });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[feeds.POST]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  try {
    const row = await prisma.feed.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ data: row });
  } catch (err) {
    console.error('[feeds.GET id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  const { text } = (req.body ?? {}) as { text?: string };

  const data: Prisma.FeedUpdateInput = {};
  if (typeof text === 'string') {
    const trimmed = text.trim();
    if (!trimmed) return res.status(400).json({ error: 'text empty' });
    data.text = trimmed;
  }
  try {
    const updated = await prisma.feed.update({ where: { id }, data });
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'not found' });
    }
    console.error('[feeds.PATCH]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'invalid id' });
  try {
    await prisma.feed.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'not found' });
    }
    console.error('[feeds.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

/** 공개 이벤트 목록 — 고정글 먼저, 최신순. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.eventPost.findMany({
      where: { published: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    res.json({ data: items });
  } catch (err) {
    console.error('[events.GET]', err);
    res.json({ data: [] });
  }
});

/** 공개 이벤트 상세 — 비공개 글은 404. */
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  try {
    const post = await prisma.eventPost.findFirst({ where: { id, published: true } });
    if (!post) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json({ data: post });
  } catch (err) {
    console.error('[events.GET/:id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

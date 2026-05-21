import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { tradeId, feedId } = (req.body ?? {}) as { tradeId?: number; feedId?: number };
  if (!tradeId && !feedId) {
    return res.status(400).json({ error: 'tradeId or feedId required' });
  }
  try {
    const existing = await prisma.bookmark.findFirst({
      where: { userId, ...(tradeId ? { tradeId } : { feedId }) },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return res.json({ bookmarked: false });
    }
    await prisma.bookmark.create({ data: { userId, tradeId, feedId } });
    res.json({ bookmarked: true });
  } catch (err) {
    console.error('[bookmark]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

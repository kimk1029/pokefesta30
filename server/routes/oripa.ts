import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { defaultNameFor } from '../lib/defaultName.js';
import { getActiveOripaBoxes, getOripaTickets, pullOripaTickets, OripaPullError } from '../lib/oripa.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const boxes = await getActiveOripaBoxes();
    res.json({ data: boxes });
  } catch (err) {
    console.error('[oripa.list]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/:packId/tickets', async (req: Request, res: Response) => {
  const packId = req.params.packId;
  if (!packId) return res.status(400).json({ error: 'packId required' });
  try {
    const tickets = await getOripaTickets(packId);
    res.json({ data: tickets });
  } catch (err) {
    console.error('[oripa.tickets]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/:packId/pull', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const packId = req.params.packId;
  if (!packId) return res.status(400).json({ error: 'packId required' });

  const indicesRaw = (req.body ?? {}) as { indices?: unknown[] };
  const indices = Array.isArray(indicesRaw.indices)
    ? (indicesRaw.indices.map(Number).filter((n) => Number.isInteger(n)) as number[])
    : [];
  if (indices.length === 0) return res.status(400).json({ error: 'indices required' });
  if (indices.length > 10) return res.status(400).json({ error: 'too many indices (max 10)' });

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const outcome = await pullOripaTickets(packId, indices, {
      id: userId,
      name: req.user!.name ?? defaultNameFor(userId),
    });
    res.json(outcome);
  } catch (err) {
    if (err instanceof OripaPullError) {
      const status = err.code === 'pack_not_found' ? 404 : 400;
      return res.status(status).json({ error: err.message });
    }
    console.error('[oripa.pull]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

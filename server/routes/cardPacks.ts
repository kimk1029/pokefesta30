import { Router, type Request, type Response } from 'express';
import { CARD_PACKS } from '@/lib/cardPacks';
import { getAllPacksWithHits, getPackWithHits } from '../lib/cardPackHits.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const withHits = req.query.withHits === '1';
  const limitRaw = Number(req.query.limit ?? 12);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12;

  if (!withHits) {
    return res.json({
      data: CARD_PACKS.map(({ hits: _hits, searchQuery: _q, ...meta }) => meta),
    });
  }
  const data = await getAllPacksWithHits(limit);
  res.json({ data });
});

router.get('/:code', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit ?? 600);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 600) : 600;

  const pack = await getPackWithHits(req.params.code, limit);
  if (!pack) return res.status(404).json({ error: 'pack not found' });
  res.json({ data: pack });
});

export default router;

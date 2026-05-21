import { Router, type Request, type Response } from 'express';
import { getOrRefreshCardPrice, getCardHistory } from '../lib/cardPrices.js';
import { findCardEntry } from '@/lib/cardsCatalog';
import { isEbayConfigured, searchEbayPrices } from '../lib/ebay.js';

const router = Router();

router.get('/ebay-search', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitRaw = Number(req.query.limit ?? 20);
  const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20), 50);
  if (!q) return res.json({ configured: isEbayConfigured(), data: null });
  if (!isEbayConfigured()) return res.json({ configured: false, data: null });
  try {
    const data = await searchEbayPrices(q, { limit });
    res.json({ configured: true, data });
  } catch (err) {
    console.error('[cards.ebay-search]', err);
    res.status(500).json({ configured: true, data: null, error: 'internal' });
  }
});

router.get('/ebay-status', async (_req: Request, res: Response) => {
  res.json({ configured: isEbayConfigured() });
});

router.get('/:id/price', async (req: Request, res: Response) => {
  const entry = findCardEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'unknown card' });

  const snap = await getOrRefreshCardPrice(entry.id, entry.ebayQuery);
  if (!snap) {
    return res.json({
      data: null,
      reason: 'no data (eBay 키 미설정 또는 검색 결과 없음)',
    });
  }
  res.json({ data: snap });
});

router.get('/:id/history', async (req: Request, res: Response) => {
  const entry = findCardEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'unknown card' });

  const daysRaw = Number(req.query.days ?? 30);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 30;
  const points = await getCardHistory(entry.id, days);
  res.json({ data: points });
});

export default router;

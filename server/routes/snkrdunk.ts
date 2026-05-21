import { Router, type Request, type Response } from 'express';
import {
  fetchSnkrdunkBrowse,
  fetchSnkrdunkSearch,
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesHistory,
  fetchSnkrdunkSalesChart,
  fetchSnkrdunkApparelGroup,
} from '@/lib/snkrdunk';

const router = Router();

router.get('/browse', async (req: Request, res: Response) => {
  const pageRaw = Number(req.query.page ?? 1);
  const page = Math.max(1, Math.min(50, Number.isFinite(pageRaw) ? pageRaw : 1));
  const results = await fetchSnkrdunkBrowse(page);
  res.json({ page, results });
});

router.get('/search', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json({ results: [] });
  const results = await fetchSnkrdunkSearch(q);
  res.json({ results });
});

function parseApparelId(raw: unknown, res: Response): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid apparel id' });
    return null;
  }
  return id;
}

router.get('/apparels/:id', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkApparel(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 상품 정보를 가져오지 못했습니다.' });
  }
  res.json({ data });
});

router.get('/apparels/:id/sales-history', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkSalesHistory(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 거래 이력을 가져오지 못했습니다.' });
  }
  res.json({ data });
});

router.get('/apparel-groups/:groupId', async (req: Request, res: Response) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ error: 'invalid groupId' });
  }
  const catRaw = Number(req.query.apparelCategoryId);
  // snkrdunk lib is typed as 25 | 14. Only honor those values.
  const apparelCategoryId: 14 | 25 | undefined =
    catRaw === 14 ? 14 : catRaw === 25 ? 25 : undefined;
  const pageRaw = Number(req.query.page ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPageRaw = Number(req.query.perPage ?? 24);
  const perPage = Math.max(1, Math.min(50, Number.isFinite(perPageRaw) ? perPageRaw : 24));
  try {
    const data = await fetchSnkrdunkApparelGroup(groupId, {
      apparelCategoryId,
      page,
      perPage,
    });
    if (!data) return res.json({ data: null });
    res.json({ data });
  } catch (err) {
    console.error('[snkrdunk.apparel-group]', err);
    res.status(500).json({ data: null, error: 'internal' });
  }
});

router.get('/apparels/:id/sales-chart', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkSalesChart(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 시세 차트를 가져오지 못했습니다.' });
  }
  res.json({ data });
});

export default router;

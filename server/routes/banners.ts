import { Router, type Request, type Response } from 'express';
import { getActiveHeroBanners } from '../lib/queries.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getActiveHeroBanners();
    res.json({ data });
  } catch (err) {
    console.error('[banners.GET]', err);
    res.json({ data: [] });
  }
});

export default router;

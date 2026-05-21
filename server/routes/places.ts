import { Router, type Request, type Response } from 'express';
import { getPlaces } from '../lib/queries.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getPlaces();
    res.json({ data });
  } catch (err) {
    console.error('[places.GET]', err);
    res.json({ data: [] });
  }
});

export default router;

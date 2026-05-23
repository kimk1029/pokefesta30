import { Router, type Request, type Response } from 'express';
import { getJpyKrwRate } from '../lib/fxRate.js';

const router = Router();

// 인증 불필요 — 환율은 공개 데이터.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const r = await getJpyKrwRate();
    // 캐시 5분 — 클라이언트가 짧게 메모리에 들고 있으면 페이지 전환마다 호출 안 함.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ data: { jpyKrw: r.rate, asOf: r.asOf, source: r.source } });
  } catch (err) {
    console.error('[fx.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

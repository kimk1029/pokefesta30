import { Router, type Request, type Response } from 'express';
import { fetchKreamSearch } from '@/lib/kream';

const router = Router();

/**
 * GET /api/kream/search?q=... — KREAM 검색(SSR HTML 스크래핑).
 *
 * 반드시 NAS(국내 가정용 IP)에서 실행돼야 한다. KREAM 안티봇은 베르셀/AWS 같은
 * 데이터센터 IP를 차단하므로, Next 라우트(베르셀 실행)로 두면 항상 빈 결과가 된다.
 * 그래서 이 경로는 Next 라우트를 두지 않고 rewrite 로 이 Express 서버에 프록시한다.
 * 캐시/타임아웃/폴백은 fetchKreamSearch(@/lib/kream) 내부에서 처리.
 */
router.get('/search', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json({ items: [] });
  const items = await fetchKreamSearch(q);
  res.json({ items });
});

export default router;

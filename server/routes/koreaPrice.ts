/**
 * GET /api/korea-price?name=&setCode=&num=&rarity=
 *   한국 멀티소스 시세 집계. 카드 이름 + (코드/번호/등급) 힌트로 각 국내 소스를 매칭 검색.
 *   반환: { rows: KoPriceRow[] } — 체결/판매 라벨이 붙은 소스별 가격.
 */
import { Router, type Request, type Response } from 'express';
import { aggregateKoPrices } from '../lib/koMarket.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!name) return res.json({ rows: [] });
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  try {
    const rows = await aggregateKoPrices({
      name,
      setCode: str(req.query.setCode),
      cardNumber: str(req.query.num),
      rarity: str(req.query.rarity),
    });
    res.json({ rows });
  } catch (err) {
    console.error('[korea-price]', err);
    res.json({ rows: [] });
  }
});

export default router;

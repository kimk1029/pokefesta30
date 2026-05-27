import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/requireAuth.js';

const router = Router();

/**
 * POST /api/search-log — 카드 검색 1건 기록.
 * body: { query: string(사용자 입력 키워드), resultCount?: number, source?: 'web'|'mobile' }
 * 로그인 상태면 userId 도 함께 저장(optionalAuth), 미로그인은 익명(null).
 * 로깅 실패가 검색 UX 를 막으면 안 되므로 항상 가볍게 응답한다.
 */
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { query?: string; resultCount?: number; source?: string };
  const query = String(body.query ?? '').trim().slice(0, 200);
  if (!query) return res.json({ ok: true, skipped: true });
  const resultCount =
    typeof body.resultCount === 'number' && Number.isFinite(body.resultCount)
      ? Math.max(0, Math.min(1_000_000, Math.round(body.resultCount)))
      : 0;
  const source = body.source === 'mobile' ? 'mobile' : 'web';
  try {
    await prisma.searchLog.create({
      data: { query, resultCount, source, userId: req.user?.userId ?? null },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[search-log.POST]', err);
    res.status(500).json({ ok: false });
  }
});

export default router;

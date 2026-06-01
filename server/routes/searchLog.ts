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

/**
 * GET /api/search-log/top — 인기 검색어 순위 (최근 30일, Top 10).
 * 카드 검색 전광판(검색어 순위)용. 실패해도 빈 배열로 안전 응답.
 */
router.get('/top', async (_req: Request, res: Response) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  try {
    const rows = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: since }, query: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10,
    });
    const items = rows.map((r) => ({ query: r.query, count: r._count._all }));
    res.json({ ok: true, items });
  } catch (err) {
    console.error('[search-log.top]', err);
    res.json({ ok: true, items: [] });
  }
});

export default router;

import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/requireAuth.js';

const router = Router();

const ALLOWED_NETWORKS = new Set(['adsense', 'adfit', 'house', 'offerwall']);

function clientIp(req: Request): string | null {
  const fwd = (req.headers['x-forwarded-for'] as string | undefined) ?? '';
  const ip = (fwd.split(',')[0] ?? '').trim().slice(0, 64);
  return ip || null;
}

function ua(req: Request): string | null {
  const v = (req.headers['user-agent'] as string | undefined) ?? '';
  return v.slice(0, 256) || null;
}

router.post('/pageview', optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { path?: string; referer?: string };
  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : null;
  if (!path) return res.status(204).end();

  const country = (req.headers['x-vercel-ip-country'] as string | undefined) ?? null;
  const referer = body.referer?.slice(0, 500) ?? null;
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  prisma.pageView
    .createMany({
      data: [
        {
          path,
          ip: clientIp(req),
          ua: ua(req),
          userId: req.user?.userId ?? null,
          country,
          referer,
          day,
        },
      ],
      skipDuplicates: true,
    })
    .catch((err) => console.error('[pageview]', err));

  res.status(204).end();
});

router.post('/ad', optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { network?: string; slotId?: string };
  const network =
    typeof body.network === 'string' && ALLOWED_NETWORKS.has(body.network) ? body.network : null;
  const slotId = typeof body.slotId === 'string' ? body.slotId.slice(0, 64) : null;
  if (!network || !slotId) return res.status(204).end();

  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  prisma.adEvent
    .create({
      data: {
        kind: 'impression',
        network,
        slotId,
        userId: req.user?.userId ?? null,
        ip: clientIp(req),
        ua: ua(req),
        day,
      },
    })
    .catch((err) => console.error('[ad-event]', err));

  res.status(204).end();
});

/**
 * POST /api/metrics/action — 사용자 행동(클릭/페이지이동 등) 배치 로깅.
 * body: { source?: 'web'|'mobile', anonId?: string, events: [{ type, path, target?, referer? }] }
 * 회원이면 optionalAuth 로 userId 첨부, 비회원은 anonId 로만 식별. 한 요청에 최대 50건.
 * 로깅 실패가 UX 를 막으면 안 되므로 항상 204 로 가볍게 응답한다.
 */
router.post('/action', optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    source?: string;
    anonId?: string;
    events?: Array<{ type?: string; path?: string; target?: string; referer?: string }>;
  };
  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) return res.status(204).end();

  const source = body.source === 'mobile' ? 'mobile' : 'web';
  const anonId = typeof body.anonId === 'string' ? body.anonId.slice(0, 64) : null;
  const userId = req.user?.userId ?? null;
  const ip = clientIp(req);
  const agent = ua(req);

  const data = events
    .slice(0, 50)
    .map((e) => ({
      type: String(e.type ?? '').trim().slice(0, 32),
      path: String(e.path ?? '').slice(0, 500),
      target: String(e.target ?? '').slice(0, 300),
      source,
      userId,
      anonId,
      ip,
      ua: agent,
      referer: typeof e.referer === 'string' ? e.referer.slice(0, 500) : null,
    }))
    .filter((e) => e.type.length > 0);

  if (data.length > 0) {
    prisma.actionLog.createMany({ data }).catch((err) => console.error('[action-log]', err));
  }
  res.status(204).end();
});

export default router;

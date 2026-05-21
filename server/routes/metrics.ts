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

export default router;

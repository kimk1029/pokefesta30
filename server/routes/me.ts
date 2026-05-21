import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { defaultNameFor } from '../lib/defaultName.js';
import {
  pickAvatar,
  pickBackground,
  pickFrame,
  buyAvatar,
  buyBackground,
  buyFrame,
} from '../lib/inventoryOps.js';
import { findCardEntry } from '@/lib/cardsCatalog';
import { levelFromPoints } from '@/lib/level';
import {
  countMyCards,
  getMyBookmarks,
  getMyCardsWithPrices,
  getMyFeeds,
  getMyInventory,
  getMyTrades,
} from '../lib/queries.js';
import { runDailyCheckIn } from '../lib/checkIn.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [inv, profile, tradeCount, savedCount, cardCount] = await Promise.all([
      getMyInventory(userId),
      prisma.user
        .findUnique({ where: { id: userId }, select: { name: true, email: true } })
        .catch(() => null),
      prisma.trade.count({ where: { authorId: userId } }).catch(() => 0),
      prisma.bookmark.count({ where: { userId } }).catch(() => 0),
      countMyCards(userId),
    ]);
    res.json({
      user: {
        id: userId,
        name: profile?.name ?? req.user!.name ?? null,
        email: profile?.email ?? req.user!.email ?? null,
      },
      inventory: inv,
      level: levelFromPoints(inv.points),
      counts: { tradeCount, savedCount, cardCount },
    });
  } catch (err) {
    console.error('[me.summary]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/cards', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.userCard.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: rows });
  } catch (err) {
    console.error('[me.cards.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/cards', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const cardIdRaw = typeof body.cardId === 'string' ? body.cardId.trim() : '';
  const cardId = cardIdRaw && findCardEntry(cardIdRaw) ? cardIdRaw : null;
  const ocrSetCode = typeof body.ocrSetCode === 'string' ? body.ocrSetCode.trim().slice(0, 16) : null;
  const ocrCardNumber =
    typeof body.ocrCardNumber === 'string' ? body.ocrCardNumber.trim().slice(0, 16) : null;

  if (!cardId && !ocrSetCode && !ocrCardNumber) {
    return res.status(400).json({ error: 'cardId 또는 OCR 식별자 중 하나는 필요해요' });
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 60) : null;
  const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 500) : null;
  const gradeEstimate =
    typeof body.gradeEstimate === 'string' ? body.gradeEstimate.trim().slice(0, 60) : null;
  const centeringScore =
    typeof body.centeringScore === 'number' && Number.isFinite(body.centeringScore)
      ? Math.max(0, Math.min(100, body.centeringScore))
      : null;
  const photoUrl =
    typeof body.photoUrl === 'string' && /^https?:\/\//.test(body.photoUrl)
      ? body.photoUrl.slice(0, 500)
      : null;

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const created = await prisma.userCard.create({
      data: {
        userId,
        cardId,
        ocrSetCode,
        ocrCardNumber,
        nickname,
        memo,
        gradeEstimate,
        centeringScore,
        photoUrl,
      },
    });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[me.cards.POST]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/cards/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const row = await prisma.userCard.findUnique({ where: { id } });
    if (!row || row.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json({ data: row });
  } catch (err) {
    console.error('[me.cards.GET id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/cards/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const row = await prisma.userCard.findUnique({ where: { id } });
    if (!row || row.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'not found' });
    }
    await prisma.userCard.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[me.cards.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/cards/with-prices', async (req: Request, res: Response) => {
  try {
    const data = await getMyCardsWithPrices(req.user!.userId, 200);
    res.json({ data });
  } catch (err) {
    console.error('[me.cards.with-prices]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/feeds', async (req: Request, res: Response) => {
  try {
    const data = await getMyFeeds(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.feeds]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/trades', async (req: Request, res: Response) => {
  try {
    const data = await getMyTrades(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.trades]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    const data = await getMyBookmarks(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.bookmarks]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/name', async (req: Request, res: Response) => {
  const raw = (req.body as { name?: unknown })?.name;
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: '닉네임은 2~20자' });
  }
  if (!/^[\p{L}\p{N}_\s.·-]+$/u.test(name)) {
    return res.status(400).json({ error: '사용할 수 없는 문자가 포함됨' });
  }
  try {
    const user = await prisma.user.upsert({
      where: { id: req.user!.userId },
      update: { name },
      create: { id: req.user!.userId, name },
      select: { id: true, name: true },
    });
    res.json({ data: user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[me.name]', msg);
    if (msg.includes('Unique constraint')) {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    }
    res.status(500).json({ error: '서버 오류: ' + msg });
  }
});

router.get('/inventory', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const checkIn = await runDailyCheckIn(userId).catch(() => null);
    const inventory = await getMyInventory(userId);
    res.json({ inventory, checkIn });
  } catch (err) {
    console.error('[me.inventory]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/points/spend', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const amountRaw = (req.body as { amount?: unknown } | null)?.amount;
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'invalid amount' });
  }
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return res.status(404).json({ ok: false, error: 'user not found' });
    if (u.points < amount) return res.status(400).json({ ok: false, error: '포인트 부족' });
    await prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: amount } },
    });
    const inv = await getMyInventory(userId);
    res.json({ ok: true, inv });
  } catch (err) {
    console.error('[me.points.spend]', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

router.post('/inventory/buy', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as {
    action?: 'buy' | 'pick';
    kind?: 'avatar' | 'bg' | 'frame';
    id?: string;
    price?: number;
  };
  const { action, kind, id, price } = body;
  if (!action || !kind || !id) {
    return res.status(400).json({ ok: false, error: 'missing fields' });
  }
  try {
    if (action === 'pick') {
      const r =
        kind === 'avatar' ? await pickAvatar(userId, id)
        : kind === 'bg' ? await pickBackground(userId, id)
        : kind === 'frame' ? await pickFrame(userId, id)
        : { ok: false as const, error: 'invalid kind' };
      return res.json(r);
    }
    if (action === 'buy') {
      const p = Number(price ?? 0);
      const r =
        kind === 'avatar' ? await buyAvatar(userId, id, p)
        : kind === 'bg' ? await buyBackground(userId, id, p)
        : kind === 'frame' ? await buyFrame(userId, id, p)
        : { ok: false as const, error: 'invalid kind' };
      return res.json(r);
    }
    res.status(400).json({ ok: false, error: 'invalid action' });
  } catch (err) {
    console.error('[me.inventory.buy]', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

export default router;

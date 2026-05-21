import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/requireAuth.js';
import { getThreads, getConversation, markThreadRead, getUnreadCount } from '../lib/messages.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const threads = await getThreads(req.user!.userId);
    res.json({ data: threads });
  } catch (err) {
    console.error('[messages.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { receiverId, text, tradeId } = (req.body ?? {}) as {
    receiverId?: string;
    text?: string;
    tradeId?: number;
  };
  if (!receiverId || typeof receiverId !== 'string') {
    return res.status(400).json({ error: 'receiverId required' });
  }
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  if (receiverId === userId) return res.status(400).json({ error: 'cannot message yourself' });

  try {
    const peer = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!peer) return res.status(404).json({ error: 'receiver not found' });

    const created = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId,
        text: text.trim().slice(0, 1000),
        tradeId: tradeId && Number.isInteger(tradeId) ? tradeId : null,
      },
    });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[messages.POST]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/unread', optionalAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.json({ count: 0 });
  try {
    const count = await getUnreadCount(req.user.userId);
    res.json({ count });
  } catch (err) {
    console.error('[messages.unread]', err);
    res.json({ count: 0 });
  }
});

router.get('/:peerId', requireAuth, async (req: Request, res: Response) => {
  const myId = req.user!.userId;
  const peerId = req.params.peerId;
  try {
    const msgs = await getConversation(myId, peerId);
    await markThreadRead(myId, peerId);
    res.json({ data: msgs });
  } catch (err) {
    console.error('[messages.peer.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/:peerId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    await markThreadRead(req.user!.userId, req.params.peerId);
    res.status(204).end();
  } catch (err) {
    console.error('[messages.read]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

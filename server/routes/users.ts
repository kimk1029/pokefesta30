import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

/** GET /api/users/:id — public minimal info (name, avatar). For peer display. */
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const u = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatarId: true, backgroundId: true, frameId: true },
    });
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json({ user: u });
  } catch (err) {
    console.error('[users.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

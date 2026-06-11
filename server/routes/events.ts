import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const AUTHOR_INCLUDE = { author: { select: { name: true } } } as const;

type PostRow = {
  author?: { name: string } | null;
  authorId?: string | null;
} & Record<string, unknown>;

/** author 관계를 authorName 평면 필드로 변환 (null = 어드민 공지). */
function toDto(p: PostRow) {
  const { author, ...rest } = p;
  return { ...rest, authorName: author?.name ?? null };
}

/** 공개 이벤트 목록 — 고정글 먼저, 최신순. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.eventPost.findMany({
      where: { published: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: AUTHOR_INCLUDE,
    });
    res.json({ data: items.map(toDto) });
  } catch (err) {
    console.error('[events.GET]', err);
    res.json({ data: [] });
  }
});

/** 공개 이벤트 상세 — 비공개 글은 404. */
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  try {
    const post = await prisma.eventPost.findFirst({
      where: { id, published: true },
      include: AUTHOR_INCLUDE,
    });
    if (!post) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json({ data: toDto(post) });
  } catch (err) {
    console.error('[events.GET/:id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

/** 회원 글 작성 — 로그인 필수. 제목/본문만 받는 단순 글 (기간/고정은 어드민 전용). */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as { title?: unknown; body?: unknown };
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 100) : '';
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 3000) : '';
  if (!title) {
    res.status(400).json({ error: '제목을 입력해주세요' });
    return;
  }
  try {
    const post = await prisma.eventPost.create({
      data: {
        title,
        body: text,
        authorId: req.user!.userId,
        published: true,
      },
      include: AUTHOR_INCLUDE,
    });
    res.status(201).json({ data: toDto(post) });
  } catch (err) {
    console.error('[events.POST]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { put } from '@vercel/blob';
import { requireAuth } from '../middleware/requireAuth.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

function extFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function makeHandler(prefix: 'feed' | 'trade', maxFiles: number) {
  return async (req: Request, res: Response) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({
        error:
          'Vercel Blob 이 설정되지 않았습니다. Vercel → Storage → Blob store 생성 후 프로젝트 연결 필요.',
      });
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) return res.status(400).json({ error: 'no files' });
    if (files.length > maxFiles) {
      return res.status(400).json({ error: `최대 ${maxFiles}장까지 업로드 가능` });
    }
    const userId = req.user!.userId;
    const urls: string[] = [];
    try {
      for (const file of files) {
        if (!ALLOWED_TYPES.has(file.mimetype)) {
          return res.status(400).json({ error: `지원하지 않는 형식: ${file.mimetype}` });
        }
        const pathname = `${prefix}/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${extFor(file.mimetype)}`;
        const { url } = await put(pathname, file.buffer, {
          access: 'public',
          contentType: file.mimetype,
        });
        urls.push(url);
      }
      res.json({ urls });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[upload.${prefix}-images]`, msg);
      res.status(500).json({ error: msg });
    }
  };
}

const router = Router();

router.post(
  '/feed-images',
  requireAuth,
  upload.array('files', 3),
  makeHandler('feed', 3),
);

router.post(
  '/trade-images',
  requireAuth,
  upload.array('files', 5),
  makeHandler('trade', 5),
);

export default router;

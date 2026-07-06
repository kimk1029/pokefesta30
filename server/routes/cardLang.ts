/**
 * 카드명 번역 API — 웹과 동일한 단일 엔진(src/lib/cardTranslate)을 서버에서 실행.
 * 앱·웹이 같은 번역 결과를 받도록 하는 공통 처리 지점.
 *  - GET  /api/card-lang/ko-ja?q=리자몽 ex   → { q, ja }   (검색어 한→일)
 *  - POST /api/card-lang/ja-ko { names: [] } → { names: [] } (표시명 일→한 배치, 최대 200)
 * 사전/엔진 수정은 src/lib/cardTranslate.ts 한 곳만 고치면 웹·앱 동시 반영.
 */
import { Router, type Request, type Response } from 'express';
import { translate, translateKnownCardNameToKo } from '@/lib/cardTranslate';

const router = Router();

router.get('/ko-ja', (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    res.status(400).json({ error: 'q required' });
    return;
  }
  if (q.length > 200) {
    res.status(400).json({ error: 'q too long' });
    return;
  }
  res.json({ q, ja: translate(q, 'ja') });
});

router.post('/ja-ko', (req: Request, res: Response) => {
  const names = Array.isArray(req.body?.names) ? (req.body.names as unknown[]) : null;
  if (!names) {
    res.status(400).json({ error: 'names[] required' });
    return;
  }
  if (names.length > 200) {
    res.status(400).json({ error: 'too many names (max 200)' });
    return;
  }
  const out = names.map((n) => {
    const s = typeof n === 'string' ? n : '';
    if (!s || s.length > 300) return s;
    return translateKnownCardNameToKo(s);
  });
  res.json({ names: out });
});

export default router;

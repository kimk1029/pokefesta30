/**
 * PSA 인구 리포트 API.
 *   GET  /api/psa/pop?setCode=&num=          — 카드의 등급별 pop (매핑돼 있으면 캐시 반환)
 *   POST /api/psa/register { certNumber, setCode, num }
 *        — PSA 인증번호 1건으로 카드 ↔ SpecID 매핑 등록 (이후 모두에게 pop 노출)
 *
 * PSA_API_TOKEN 미설정이면 status:'disabled' — 클라이언트는 섹션 자체를 숨긴다.
 */
import { Router, type Request, type Response } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { getPopForCard, psaEnabled, registerCertForCard } from '../lib/psaPop.js';

const router = Router();

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

router.get('/pop', async (req: Request, res: Response) => {
  if (!psaEnabled()) return res.json({ status: 'disabled' });
  const setCode = str(req.query.setCode);
  const num = str(req.query.num);
  if (!setCode || !num) return res.json({ status: 'unmapped' });
  try {
    const pop = await getPopForCard(setCode, num);
    res.json(pop ? { status: 'ok', pop } : { status: 'unmapped' });
  } catch (err) {
    console.error('[psa.pop]', err);
    res.json({ status: 'unmapped' });
  }
});

// 등록은 PSA API 를 최대 2콜 소모 — 일 쿼터(100콜) 보호용 레이트리밋.
const registerLimit = rateLimit({ windowMs: 10 * 60_000, max: 10, name: 'psa-register' });

router.post('/register', registerLimit, async (req: Request, res: Response) => {
  if (!psaEnabled()) return res.json({ status: 'disabled' });
  const certNumber = str(req.body?.certNumber)?.replace(/[\s-]/g, '') ?? null;
  const setCode = str(req.body?.setCode);
  const num = str(req.body?.num);
  if (!certNumber || !/^\d{5,12}$/.test(certNumber)) {
    return res.json({ status: 'error', reason: 'bad-cert' });
  }
  if (!setCode || !num) return res.json({ status: 'error', reason: 'no-card-key' });
  try {
    const r = await registerCertForCard(certNumber, setCode, num);
    if (r.ok === false) return res.json({ status: 'error', reason: r.reason });
    res.json({ status: 'ok', pop: r.pop });
  } catch (err) {
    console.error('[psa.register]', err);
    res.json({ status: 'error', reason: 'save-failed' });
  }
});

export default router;

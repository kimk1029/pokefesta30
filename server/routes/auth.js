import { Router } from 'express';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { signSession, extractToken, verifySession } from '../lib/auth.js';
import { setSessionCookie, clearSessionCookie } from '../lib/cookies.js';
import { getProvider } from '../lib/oauth/index.js';
import { defaultNameFor } from '../lib/defaultName.js';

const router = Router();

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const MOBILE_SCHEME = process.env.MOBILE_DEEP_LINK_SCHEME ?? 'pokefesta30';
const STATE_TTL_MS = 10 * 60 * 1000;

// OAuth state 는 HMAC 서명만으로 검증한다 — 쿠키 기반 nonce 는 모바일 WebView
// 에서 Next rewrite 프록시 / cross-site 쿠키 격리 때문에 자주 손실됨.
// JWT_SECRET 으로 base64url(payload).base64url(sig) 형태로 묶고 콜백에서 검증.
function getStateSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

function signState(payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', getStateSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyState(raw) {
  if (typeof raw !== 'string' || !raw.includes('.')) return null;
  const idx = raw.lastIndexOf('.');
  const b64 = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = createHmac('sha256', getStateSecret()).update(b64).digest('base64url');
  let a, b;
  try {
    a = Buffer.from(sig, 'base64url');
    b = Buffer.from(expected, 'base64url');
  } catch {
    return null;
  }
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function safeReturnPath(input) {
  if (!input || typeof input !== 'string') return '/';
  if (!input.startsWith('/') || input.startsWith('//')) return '/';
  return input;
}

router.get('/me', async (req, res) => {
  const token = extractToken(req);
  if (!token) return res.json({ user: null });
  try {
    const session = await verifySession(token);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, avatar: true, avatarId: true },
    });
    if (!user) return res.json({ user: null });
    return res.json({
      user: { ...user, provider: session.provider ?? null },
    });
  } catch {
    return res.json({ user: null });
  }
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/:provider', (req, res) => {
  const provider = getProvider(req.params.provider);
  if (!provider) return res.status(404).json({ error: 'unknown provider' });

  const nonce = randomBytes(16).toString('hex');
  const platform = req.query.platform === 'mobile' ? 'mobile' : 'web';
  const returnTo = safeReturnPath(typeof req.query.redirect === 'string' ? req.query.redirect : '/');
  const stateValue = signState({ n: nonce, p: platform, r: returnTo, t: Date.now() });

  res.redirect(provider.buildAuthorizeUrl(stateValue));
});

router.get('/callback/:provider', async (req, res) => {
  const provider = getProvider(req.params.provider);
  if (!provider) return res.status(404).send('unknown provider');

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !stateRaw) return res.status(400).send('missing code/state');

  const state = verifyState(stateRaw);
  if (!state) return res.status(400).send('state signature mismatch');
  if (typeof state.t !== 'number' || Date.now() - state.t > STATE_TTL_MS) {
    return res.status(400).send('state expired');
  }

  try {
    const accessToken = await provider.exchangeCode(code, stateRaw);
    const info = await provider.fetchUserInfo(accessToken);
    if (!info?.id) return res.status(400).send('userinfo missing id');

    const userId = info.id;
    const displayName = info.name?.trim() || defaultNameFor(userId);

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: info.email ? { email: info.email } : {},
      create: {
        id: userId,
        name: displayName,
        ...(info.email ? { email: info.email } : {}),
      },
    });

    const token = await signSession({
      userId: user.id,
      provider: provider.provider,
      email: user.email ?? undefined,
      name: user.name,
    });

    if (state.p === 'mobile') {
      const url = `${MOBILE_SCHEME}://auth?token=${encodeURIComponent(token)}`;
      return res.redirect(url);
    }

    setSessionCookie(res, token);
    const target = `${WEB_BASE_URL}${safeReturnPath(state.r)}`;
    return res.redirect(target);
  } catch (err) {
    console.error('[auth.callback]', err);
    return res.status(500).send('auth failed');
  }
});

export default router;

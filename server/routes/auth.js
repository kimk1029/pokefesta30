import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { signSession, extractToken, verifySession } from '../lib/auth.js';
import {
  setSessionCookie,
  clearSessionCookie,
  setOAuthStateCookie,
  readOAuthStateCookie,
  clearOAuthStateCookie,
} from '../lib/cookies.js';
import { getProvider } from '../lib/oauth/index.js';
import { defaultNameFor } from '../lib/defaultName.js';

const router = Router();

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const MOBILE_SCHEME = process.env.MOBILE_DEEP_LINK_SCHEME ?? 'pokefesta30';

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
  const statePayload = { n: nonce, p: platform, r: returnTo };
  const stateValue = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  setOAuthStateCookie(res, nonce);
  res.redirect(provider.buildAuthorizeUrl(stateValue));
});

router.get('/callback/:provider', async (req, res) => {
  const provider = getProvider(req.params.provider);
  if (!provider) return res.status(404).send('unknown provider');

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !stateRaw) return res.status(400).send('missing code/state');

  let state;
  try {
    state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
  } catch {
    return res.status(400).send('invalid state');
  }

  const cookieNonce = readOAuthStateCookie(req);
  clearOAuthStateCookie(res);
  if (!cookieNonce || cookieNonce !== state.n) return res.status(400).send('state mismatch');

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

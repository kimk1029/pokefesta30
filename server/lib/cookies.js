import { sessionCookieName } from './auth.js';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function baseOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'lax' : 'lax',
    secure: isProd,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(res, token, maxAgeSec = THIRTY_DAYS) {
  res.cookie(sessionCookieName, token, { ...baseOptions(), maxAge: maxAgeSec * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName, baseOptions());
}

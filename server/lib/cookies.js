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

const OAUTH_STATE_COOKIE = 'pf30_oauth_state';
const OAUTH_STATE_TTL = 10 * 60; // 10 minutes

export function setOAuthStateCookie(res, value) {
  res.cookie(OAUTH_STATE_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_STATE_TTL * 1000,
  });
}

export function readOAuthStateCookie(req) {
  return req.cookies?.[OAUTH_STATE_COOKIE] ?? null;
}

export function clearOAuthStateCookie(res) {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
}

export const oauthStateCookieName = OAUTH_STATE_COOKIE;

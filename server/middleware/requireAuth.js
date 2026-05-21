import { extractToken, verifySession } from '../lib/auth.js';

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = await verifySession(token);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

export async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await verifySession(token);
  } catch {
    // Ignore — treat as anonymous
  }
  next();
}

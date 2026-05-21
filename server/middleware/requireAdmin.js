import { requireAuth } from './requireAuth.js';

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const email = req.user?.email?.toLowerCase();
    if (!email || !adminEmails().has(email)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  });
}

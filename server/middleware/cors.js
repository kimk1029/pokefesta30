import cors from 'cors';

function parseOrigins() {
  const raw = process.env.CORS_ORIGINS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildCors() {
  const allowed = new Set(parseOrigins());
  return cors({
    origin(origin, cb) {
      // Allow no-Origin requests (curl, server-to-server, mobile native fetch)
      if (!origin) return cb(null, true);
      if (allowed.size === 0) return cb(null, true); // permissive in dev when unset
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  });
}

/**
 * 의존성 없는 간단한 슬라이딩 윈도우 레이트리밋.
 * 키 기본값: 로그인 유저 id → 없으면 IP. 초과 시 429.
 */
export function rateLimit({ windowMs, max, name = 'default' }) {
  /** key → 최근 요청 timestamp 배열 */
  const hits = new Map();
  let lastSweep = Date.now();

  return (req, res, next) => {
    const now = Date.now();

    // 주기적으로 만료된 키 정리 (윈도우 2배마다) — 무한 성장 방지
    if (now - lastSweep > windowMs * 2) {
      lastSweep = now;
      for (const [k, arr] of hits) {
        const alive = arr.filter((t) => now - t < windowMs);
        if (alive.length === 0) hits.delete(k);
        else hits.set(k, alive);
      }
    }

    const key = req.user?.userId ?? req.ip ?? 'anon';
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      const retryAfterSec = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
      return res.status(429).json({
        error: `요청이 너무 많습니다. ${Math.max(1, Math.ceil(retryAfterSec / 60))}분 후 다시 시도해주세요.`,
        code: 'rate_limited',
        limiter: name,
      });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

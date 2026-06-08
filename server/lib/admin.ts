/** 어드민 이메일 판별 — ADMIN_EMAILS(쉼표 구분) env 기준. */
export function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.toLowerCase());
}

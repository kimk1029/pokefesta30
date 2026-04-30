import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * 어드민 화이트리스트 (이메일). `ADMIN_EMAILS` 환경변수에 콤마로 구분해 등록.
 * 예) ADMIN_EMAILS="kimk10291@gmail.com, ops@pokefesta.com"
 *
 * 비교는 소문자/공백 트림 후 수행.
 */
function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/**
 * 서버 컴포넌트 / API 라우트에서 호출. 어드민 세션이면 세션 반환, 아니면 null.
 * 라우트 가드용으로 사용:
 *   const s = await requireAdminSession();
 *   if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!isAdminEmail(session.user.email)) return null;
  return session;
}

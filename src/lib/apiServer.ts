/**
 * Server Component / Server-side fetch wrapper.
 * - dev: Next 가 `/api/*`, `/auth/*` 를 Express 로 rewrite 하지만 Server Component
 *   에서는 절대 URL 이 필요. 직접 Express 서버 (`API_INTERNAL_URL`) 로 호출한다.
 * - 인증이 필요한 호출에는 `pf30_session` 쿠키를 `Cookie:` 헤더로 포워딩.
 */
import { cookies } from 'next/headers';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'pf30_session';

function baseUrl(): string {
  const raw = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3030';
  return raw.replace(/\/$/, '');
}

interface ServerFetchOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 인증 쿠키 포워딩 여부 (기본 true). */
  auth?: boolean;
  cache?: RequestCache;
}

export async function serverFetch<T>(
  path: string,
  opts: ServerFetchOpts = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const url = `${baseUrl()}${path}`;
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const session = cookies().get(SESSION_COOKIE);
    if (session) headers['Cookie'] = `${session.name}=${session.value}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: opts.cache ?? 'no-store',
    });
  } catch (err) {
    console.error('[serverFetch] network', path, err);
    return { ok: false, status: 0, data: null };
  }
  if (res.status === 204) return { ok: true, status: 204, data: null };
  try {
    const data = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: res.ok, status: res.status, data: null };
  }
}

export interface ServerSessionUser {
  id: string;
  name: string | null;
  email: string | null;
  provider?: string | null;
}

/**
 * Server Component / route segment 에서 현재 로그인 사용자 조회.
 * NextAuth 의 `getServerSession(authOptions)` 대체.
 */
export async function getServerUser(): Promise<ServerSessionUser | null> {
  const session = cookies().get(SESSION_COOKIE);
  if (!session) return null;
  const r = await serverFetch<{ user: ServerSessionUser | null }>('/auth/me', {
    cache: 'no-store',
  });
  return r.data?.user ?? null;
}

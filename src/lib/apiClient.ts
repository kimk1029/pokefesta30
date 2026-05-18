/**
 * 웹 API (Next.js src/app/api/*) 호출용 클라이언트.
 *
 * baseUrl 은 `EXPO_PUBLIC_WEB_BASE_URL` 환경 변수에서 가져온다.
 * (예: `https://pokefesta30.com` 또는 개발 시 `http://192.168.1.10:3000`)
 *
 * 인증은 NextAuth 세션 쿠키 (`next-auth.session-token` 또는
 * `__Secure-next-auth.session-token`) 를 [[session]] 모듈이 관리한다.
 * 401 응답은 호출자가 빈 상태 UI 를 보여줄 수 있게 그대로 던진다.
 */
import { getSessionCookieHeader } from './session';

const DEFAULT_BASE = 'https://tcgbreaker.vercel.app';

export function getWebBaseUrl(): string {
  const v = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  if (typeof v === 'string' && v.length > 0) return v.replace(/\/$/, '');
  return DEFAULT_BASE;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface ApiOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 인증 쿠키 자동 첨부 여부. 기본 true. */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const url = `${getWebBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const cookie = getSessionCookieHeader();
    if (cookie) headers['Cookie'] = cookie;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiError(0, null, err instanceof Error ? err.message : 'network');
  }

  const txt = await res.text();
  let parsed: unknown = null;
  if (txt) {
    try {
      parsed = JSON.parse(txt);
    } catch {
      parsed = txt;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed, `API ${res.status} on ${path}`);
  }
  return parsed as T;
}

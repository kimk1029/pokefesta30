/**
 * NextAuth 세션 쿠키를 디바이스에 저장 / 로드.
 *
 * 웹 (Next.js) 은 `next-auth.session-token` (개발) 또는
 * `__Secure-next-auth.session-token` (HTTPS) 쿠키에 JWT 를 담는다.
 * 모바일에서 웹 API 를 호출하려면 이 토큰을 `Cookie:` 헤더로 같이 보내야 한다.
 *
 * 토큰은 로그인 화면에서 WebView 가 가로채서 `setSessionToken` 으로 저장하고,
 * 그 이후 모든 API 호출이 자동으로 토큰을 첨부한다.
 */
import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'session.json';

interface Stored {
  cookieName: string;
  token: string;
  /** 만료 ms epoch. null 이면 세션 쿠키 (앱 끄면 사라지는 게 정상이지만 보존). */
  expiresAt: number | null;
  /** 디버그용 — 이 토큰이 어느 base url 로부터 잡힌 것인지. */
  baseUrl: string;
}

function getFile(): File {
  return new File(Paths.document, FILE_NAME);
}

let memo: Stored | null | undefined;
const listeners = new Set<() => void>();

function readSync(): Stored | null {
  if (memo !== undefined) return memo;
  try {
    const f = getFile();
    if (!f.exists) {
      memo = null;
      return null;
    }
    const txt = f.textSync();
    const parsed = JSON.parse(txt) as Stored;
    if (!parsed?.token || !parsed?.cookieName) {
      memo = null;
      return null;
    }
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      memo = null;
      return null;
    }
    memo = parsed;
    return parsed;
  } catch {
    memo = null;
    return null;
  }
}

function emit() {
  for (const fn of listeners) fn();
}

export function getSession(): Stored | null {
  return readSync();
}

export function getSessionCookieHeader(): string | null {
  const s = readSync();
  if (!s) return null;
  return `${s.cookieName}=${s.token}`;
}

export function setSession(next: Stored | null) {
  const f = getFile();
  if (next === null) {
    if (f.exists) f.delete();
    memo = null;
  } else {
    if (!f.exists) f.create();
    f.write(JSON.stringify(next));
    memo = next;
  }
  emit();
}

export function isAuthenticated(): boolean {
  return readSync() !== null;
}

export function subscribeSession(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

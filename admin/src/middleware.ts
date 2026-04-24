import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse(
      'Admin not configured — set ADMIN_USERNAME and ADMIN_PASSWORD env vars.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return challenge();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return challenge();
  }
  const sep = decoded.indexOf(':');
  const u = sep >= 0 ? decoded.slice(0, sep) : '';
  const p = sep >= 0 ? decoded.slice(sep + 1) : '';
  if (u !== user || p !== pass) return challenge();

  return NextResponse.next();
}

function challenge() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="pokefesta30 admin", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

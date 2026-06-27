import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@/lib/types';

const PUBLIC_PATHS = ['/login', '/reset-password', '/api/auth', '/set-password'];

const ROLE_REQUIRED: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/(audit|gaming|security)/, roles: ['CIO'] },
  { pattern: /^\/dashboard\/(approval|portfolio)/, roles: ['CIO', 'PM', 'SR_ANALYST'] },
];

const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  // Optimistic check: verify session cookie exists (real validation happens in each API route/page)
  const sessionCookie = req.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Role check uses x-user-role header set by the app (not validated here — API routes enforce this)
  const role = req.headers.get('x-user-role') as Role | null;
  if (role) {
    for (const { pattern, roles } of ROLE_REQUIRED) {
      if (pattern.test(pathname) && !(roles as string[]).includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

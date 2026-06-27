import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@/lib/generated/prisma';

// Routes that require at least one of the listed roles
const ROLE_REQUIRED: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/(audit|gaming|security)/, roles: ['CIO'] },
  { pattern: /^\/dashboard\/(approval|portfolio)/, roles: ['CIO', 'PM', 'SR_ANALYST'] },
];

// Public routes that never need auth
const PUBLIC_PATHS = ['/login', '/reset-password', '/api/auth'];

export const proxy = auth(async (req: NextRequest & { auth?: Awaited<ReturnType<typeof auth>> }) => {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  const session = (req as unknown as { auth: { user?: { id: string; role: Role; mfaEnabled: boolean; passwordChangedAt?: string | null } } | null }).auth;

  // Not authenticated → login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { role } = session.user;

  // Role-gated routes
  for (const { pattern, roles } of ROLE_REQUIRED) {
    if (pattern.test(pathname) && !(roles as string[]).includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Allow /set-password and /dashboard/setup-mfa through so those pages can render
  if (pathname === '/set-password' || pathname === '/dashboard/setup-mfa') {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

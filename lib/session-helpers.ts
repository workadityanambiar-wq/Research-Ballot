import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// NextAuth v5 database-strategy session cookie name
function sessionCookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
}

export async function createDbSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken: token, userId, expires } });
  return { token, expires };
}

export function attachSessionCookie(res: NextResponse, token: string, expires: Date): NextResponse {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    expires,
    path: '/',
  });
  return res;
}

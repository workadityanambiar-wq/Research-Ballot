import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// NextAuth v5 database-strategy session cookie name
const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

export async function createDbSession(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({
    data: { sessionToken: token, userId, expires, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent },
  });
  return { token, expires };
}

export function attachSessionCookie(res: NextResponse, token: string, expires: Date): NextResponse {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    expires,
    path: '/',
  });
  return res;
}

// Direct DB session lookup — bypasses NextAuth adapter compatibility issues
export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!record || record.expires < new Date()) return null;

  // Non-blocking lastActiveAt update — only when stale > 1 min
  const now = new Date();
  if (now.getTime() - record.lastActiveAt.getTime() > 60_000) {
    prisma.session.update({ where: { sessionToken: token }, data: { lastActiveAt: now } }).catch(() => {});
  }

  return record.user;
}

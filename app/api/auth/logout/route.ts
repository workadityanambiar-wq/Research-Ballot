import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', { expires: new Date(0), path: '/' });
  return res;
}

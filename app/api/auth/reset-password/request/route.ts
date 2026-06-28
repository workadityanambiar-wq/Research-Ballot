import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSecureToken, hashToken } from '@/lib/auth-helpers';
import { checkResetRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    // Always 200 to prevent email enumeration
    return NextResponse.json({ success: true });
  }

  const rateCheck = await checkResetRateLimit(email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ success: true }); // silently rate-limit
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
  });

  if (user) {
    // Invalidate any existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const base = process.env.APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const resetUrl = `${base}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email!, user.displayName, resetUrl);
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'PASSWORD_RESET_REQUESTED', detail: `Reset link sent to ${user.email}`, risk: 'LOW' },
    });
  }

  return NextResponse.json({ success: true });
}

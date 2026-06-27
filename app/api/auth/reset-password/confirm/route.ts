import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  hashToken,
  hashPassword,
  verifyPasswordHash,
  checkPasswordPolicy,
  PASSWORD_EXPIRY_DAYS,
  PASSWORD_HISTORY_LIMIT,
} from '@/lib/auth-helpers';
import { sendPasswordChangedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  let body: { token?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const policy = checkPasswordPolicy(newPassword);
  if (!policy.ok) return NextResponse.json({ error: policy.error }, { status: 422 });

  // Cannot reuse current password
  if (await verifyPasswordHash(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: 'New password must differ from your current password.' }, { status: 422 });
  }

  // History check
  const history = await prisma.passwordHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: PASSWORD_HISTORY_LIMIT,
  });
  for (const entry of history) {
    if (await verifyPasswordHash(newPassword, entry.passwordHash)) {
      return NextResponse.json({ error: `You cannot reuse your last ${PASSWORD_HISTORY_LIMIT} passwords.` }, { status: 422 });
    }
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordHistory.create({ data: { userId: user.id, passwordHash: user.passwordHash } }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, passwordChangedAt: now, passwordExpiresAt: expiresAt },
    }),
    prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: now } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_RESET_COMPLETED', detail: 'Password reset via email link', risk: 'LOW' } }),
  ]);

  await sendPasswordChangedEmail(user.email!, user.displayName, now.toUTCString());
  return NextResponse.json({ success: true });
}

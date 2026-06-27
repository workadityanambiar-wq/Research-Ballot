import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { createDbSession, attachSessionCookie } from '@/lib/session-helpers';
import {
  verifyPasswordHash,
  hashPassword,
  checkPasswordPolicy,
  PASSWORD_EXPIRY_DAYS,
  PASSWORD_HISTORY_LIMIT,
} from '@/lib/auth-helpers';
import { sendPasswordChangedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!newPassword) {
    return NextResponse.json({ error: 'New password is required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // First-login flow: passwordChangedAt is null → no current password needed
  if (user.passwordChangedAt) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }
    const valid = await verifyPasswordHash(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }
  }

  // Policy check
  const policy = checkPasswordPolicy(newPassword);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.error }, { status: 422 });
  }

  // Cannot reuse current password
  const sameCurrent = await verifyPasswordHash(newPassword, user.passwordHash);
  if (sameCurrent) {
    return NextResponse.json({ error: 'New password must differ from your current password.' }, { status: 422 });
  }

  // Password history check (last N passwords)
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
    // Save old hash to history
    prisma.passwordHistory.create({ data: { userId: user.id, passwordHash: user.passwordHash } }),
    // Update user
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, passwordChangedAt: now, passwordExpiresAt: expiresAt },
    }),
    // Terminate all other sessions
    prisma.session.deleteMany({ where: { userId: user.id } }),
    // Audit log
    prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_CHANGED', detail: 'Password updated', ipAddress: ip, device: userAgent, risk: 'LOW' } }),
  ]);

  await sendPasswordChangedEmail(user.email!, user.displayName, now.toUTCString());

  // Create a fresh session so the user stays logged in after the password change
  const { token, expires } = await createDbSession(user.id);
  return attachSessionCookie(NextResponse.json({ success: true }), token, expires);
}

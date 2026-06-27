import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { verifyTotpCode, encryptTotpSecret } from '@/lib/auth-helpers';
import { sendMfaEnrolledEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  let body: { totpCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { totpCode } = body;
  if (!totpCode) {
    return NextResponse.json({ error: 'Authenticator code required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.pendingMfaSecret) {
    return NextResponse.json({ error: 'No pending MFA setup found. Start setup again.' }, { status: 400 });
  }

  const valid = verifyTotpCode(user.pendingMfaSecret, totpCode.trim());
  if (!valid) {
    return NextResponse.json({ error: 'Invalid code. Make sure your device time is correct.' }, { status: 401 });
  }

  const encryptedSecret = encryptTotpSecret(user.pendingMfaSecret);
  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: encryptedSecret, mfaEnabled: true, mfaEnrolledAt: now, pendingMfaSecret: null },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'MFA_ENROLLED', detail: 'TOTP MFA enrolled successfully', ipAddress: ip, device: userAgent, risk: 'LOW' },
  });

  await sendMfaEnrolledEmail(user.email!, user.displayName);

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { signIn } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { hashToken, verifyTotpCode, decryptTotpSecret } from '@/lib/auth-helpers';
import { sendNewDeviceLoginEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';

  let body: { mfaToken?: string; totpCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { mfaToken, totpCode } = body;
  if (!mfaToken || !totpCode) {
    return NextResponse.json({ error: 'MFA token and code required.' }, { status: 400 });
  }

  const tokenHash = hashToken(mfaToken);
  const record = await prisma.mfaToken.findUnique({ where: { tokenHash } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'MFA session expired. Please log in again.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.mfaSecret) {
    return NextResponse.json({ error: 'MFA not configured.' }, { status: 401 });
  }

  const secret = decryptTotpSecret(user.mfaSecret);
  const valid = await verifyTotpCode(secret, totpCode.trim());

  // Delete the one-time MFA token regardless of outcome
  await prisma.mfaToken.delete({ where: { tokenHash } });

  if (!valid) {
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_MFA_FAILED', detail: 'Invalid TOTP code', ipAddress: ip, device: userAgent, risk: 'HIGH' } });
    return NextResponse.json({ error: 'Invalid authenticator code.' }, { status: 401 });
  }

  await signIn('credentials', { userId: user.id, redirect: false });
  await sendNewDeviceLoginEmail(user.email!, user.displayName, ip, userAgent, new Date().toUTCString());
  await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_MFA_SUCCESS', detail: 'MFA verification passed', ipAddress: ip, device: userAgent, risk: 'LOW' } });

  return NextResponse.json({ success: true });
}

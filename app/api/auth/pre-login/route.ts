import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { signIn } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import {
  verifyPasswordHash,
  generateSecureToken,
  hashToken,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES_TIER1,
  LOCKOUT_MINUTES_TIER2,
} from '@/lib/auth-helpers';
import { checkLoginRateLimit } from '@/lib/rate-limit';
import { sendAccountLockedEmail, sendNewDeviceLoginEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';

  // Rate limiting
  const rateCheck = await checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Look up user (always run hash to prevent timing attacks)
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
  });

  // Use a dummy hash if user not found — prevents email enumeration via timing
  const hashToCheck = user?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$dummy';
  const passwordValid = user ? await verifyPasswordHash(password, hashToCheck) : false;

  if (!user || !passwordValid) {
    if (user) {
      // Track failed attempts
      const newFailCount = user.failedAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newFailCount >= 10) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES_TIER2 * 60 * 1000);
      } else if (newFailCount >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES_TIER1 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newFailCount, lockedUntil },
      });

      if (lockedUntil && newFailCount === MAX_FAILED_ATTEMPTS) {
        await sendAccountLockedEmail(user.email!, user.displayName, lockedUntil.toUTCString());
        await prisma.auditLog.create({ data: { userId: user.id, action: 'ACCOUNT_LOCKED', detail: `Locked after ${newFailCount} failed attempts`, ipAddress: ip, device: userAgent, risk: 'HIGH' } });
      }

      await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_FAILED', detail: `Invalid password (attempt ${newFailCount})`, ipAddress: ip, device: userAgent, risk: 'MEDIUM' } });
    }
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_FAILED', detail: 'Login attempt while account locked', ipAddress: ip, device: userAgent, risk: 'HIGH' } });
    return NextResponse.json({
      error: `Account locked. Try again after ${user.lockedUntil.toUTCString()}.`,
      locked: true,
    }, { status: 423 });
  }

  // Clear failed attempts on success
  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });

  // Password never changed → sign in, then redirect to set-password
  if (!user.passwordChangedAt) {
    await signIn('credentials', { userId: user.id, redirect: false });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS', detail: 'Login success — first-login password change required', ipAddress: ip, device: userAgent, risk: 'MEDIUM' } });
    return NextResponse.json({ mustChangePassword: true });
  }

  // Password expired → sign in, then redirect to change-password
  if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
    await signIn('credentials', { userId: user.id, redirect: false });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS', detail: 'Login success — password expired', ipAddress: ip, device: userAgent, risk: 'MEDIUM' } });
    return NextResponse.json({ passwordExpired: true });
  }

  // MFA required?
  if (user.mfaEnabled && user.mfaEnrolledAt) {
    const mfaToken = generateSecureToken();
    const mfaTokenHash = hashToken(mfaToken);
    await prisma.mfaToken.create({
      data: { userId: user.id, tokenHash: mfaTokenHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    return NextResponse.json({ mfaRequired: true, mfaToken, userId: user.id });
  }

  // MFA enrollment required for CIO/PM
  if ((user.role === 'CIO' || user.role === 'PM') && !user.mfaEnrolledAt) {
    // Sign in, but redirect to MFA setup
    await signIn('credentials', { userId: user.id, redirect: false });
    await sendNewDeviceLoginEmail(user.email!, user.displayName, ip, userAgent, new Date().toUTCString());
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS', detail: 'Login success — MFA enrollment required', ipAddress: ip, device: userAgent, risk: 'MEDIUM' } });
    return NextResponse.json({ mustEnrollMfa: true });
  }

  // No MFA needed — sign in directly
  await signIn('credentials', { userId: user.id, redirect: false });
  await sendNewDeviceLoginEmail(user.email!, user.displayName, ip, userAgent, new Date().toUTCString());
  await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS', detail: 'Login success', ipAddress: ip, device: userAgent, risk: 'LOW' } });
  return NextResponse.json({ success: true });
}

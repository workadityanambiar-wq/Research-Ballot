import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { generateTotpSecret, getTotpUri } from '@/lib/auth-helpers';

// GET — generate a new TOTP secret and return QR code data URL
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const secret = generateTotpSecret();
  const otpauthUrl = getTotpUri(user.email!, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Store pending secret (not yet confirmed)
  await prisma.user.update({ where: { id: user.id }, data: { pendingMfaSecret: secret } });

  return NextResponse.json({ qrDataUrl, secret });
}

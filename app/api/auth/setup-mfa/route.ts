import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { generateTotpSecret, getTotpUri } from '@/lib/auth-helpers';
import { getSessionUser } from '@/lib/session-helpers';

// GET — generate a new TOTP secret and return QR code data URL
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const secret = generateTotpSecret();
  const otpauthUrl = await getTotpUri(sessionUser.email!, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  await prisma.user.update({ where: { id: sessionUser.id }, data: { pendingMfaSecret: secret } });

  return NextResponse.json({ qrDataUrl, secret });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json(null, { status: 401 });
  return NextResponse.json({
    id: user.id,
    email: user.email ?? '',
    name: user.displayName,
    displayName: user.displayName,
    legacyId: user.legacyId,
    title: user.title,
    role: user.role,
    tier: user.tier === 'A_PLUS' ? 'A+' : user.tier,
    mfaEnabled: user.mfaEnabled,
  });
}

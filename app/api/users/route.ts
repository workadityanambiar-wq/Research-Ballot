import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.user.findMany({
    where: {
      NOT: { legacyId: { startsWith: 'test.' } },
    },
    select: {
      legacyId: true,
      displayName: true,
      email: true,
      title: true,
      role: true,
      tier: true,
      hitRate: true,
      avgRet: true,
      sharpe: true,
      drawCtrl: true,
      consistency: true,
      peerScore: true,
      ideaScore: true,
      allocScore: true,
      researchScore: true,
    },
    orderBy: { researchScore: 'desc' },
  });

  const isCio = sessionUser.role === 'CIO';

  return NextResponse.json(
    rows.map(u => ({
      id: u.legacyId,
      name: u.displayName,
      email: isCio ? (u.email ?? '') : '',
      title: u.title,
      role: u.role as string,
      tier: u.tier === 'A_PLUS' ? 'A+' : (u.tier as string),
      hitRate: u.hitRate,
      avgRet: u.avgRet,
      sharpe: u.sharpe,
      drawCtrl: u.drawCtrl,
      consistency: u.consistency,
      peerScore: u.peerScore,
      ideaScore: u.ideaScore,
      allocScore: u.allocScore,
      researchScore: u.researchScore,
    }))
  );
}

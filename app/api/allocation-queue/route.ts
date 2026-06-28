import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entries = await prisma.allocationQueueEntry.findMany({
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
    include: {
      idea: {
        select: {
          id: true, ticker: true, dir: true, finalScore: true, approvalStatus: true,
          pmScore: true,
          researchDoc: { select: { overview: true } },
        },
      },
    },
  });

  return NextResponse.json(entries.map(e => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    idea: e.idea ? {
      ...e.idea,
      dir: e.idea.dir as string,
      approvalStatus: e.idea.approvalStatus as string,
    } : null,
  })));
}

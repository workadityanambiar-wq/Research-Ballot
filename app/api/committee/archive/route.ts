import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status'); // APPROVED / REJECTED / APPROVED_WITH_CONDITIONS
  const dir = searchParams.get('dir');
  const search = searchParams.get('q');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;

  const where: Record<string, unknown> = {
    approvalStatus: status ? { equals: status } : { in: ['APPROVED', 'REJECTED', 'APPROVED_WITH_CONDITIONS'] },
  };
  if (dir) where.dir = dir;
  if (search) where.ticker = { contains: search, mode: 'insensitive' };

  const [total, ideas] = await Promise.all([
    prisma.idea.count({ where: where as never }),
    prisma.idea.findMany({
      where: where as never,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        researchDoc: { select: { id: true, overview: true, authorId: true } },
        challenges: { select: { id: true, status: true } },
        questions: { select: { id: true, status: true } },
        voteJustifications: { select: { id: true, decision: true, userId: true } },
        allocationQueue: { select: { id: true, rank: true, status: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    ideas: ideas.map(i => ({
      ...i,
      dir: i.dir as string,
      approvalStatus: i.approvalStatus as string,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      challengeCount: i.challenges.length,
      openChallenges: i.challenges.filter(c => c.status === 'OPEN').length,
      questionCount: i.questions.length,
      voteCount: i.voteJustifications.length,
    })),
  });
}

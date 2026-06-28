import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ ideas: [], research: [], comments: [] });

  const [ideas, docs, comments] = await Promise.all([
    prisma.idea.findMany({
      where: {
        OR: [
          { ticker: { contains: q.toUpperCase() } },
          { thesis: { contains: q, mode: 'insensitive' } },
          { assetClass: { contains: q, mode: 'insensitive' } },
          { id: { contains: q.toUpperCase() } },
        ],
      },
      select: { id: true, ticker: true, dir: true, thesis: true, approvalStatus: true, authorId: true, weekId: true, finalScore: true },
      take: 20,
    }),
    prisma.researchDoc.findMany({
      where: {
        OR: [
          { thesis: { contains: q, mode: 'insensitive' } },
          { financials: { contains: q, mode: 'insensitive' } },
          { valuation: { contains: q, mode: 'insensitive' } },
          { technical: { contains: q, mode: 'insensitive' } },
          { idea: { ticker: { contains: q.toUpperCase() } } },
        ],
      },
      include: { idea: { select: { ticker: true, dir: true } } },
      take: 20,
    }),
    prisma.researchComment.findMany({
      where: { content: { contains: q, mode: 'insensitive' }, deletedAt: null },
      include: { doc: { include: { idea: { select: { ticker: true } } } } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    ideas: ideas.map(i => ({ ...i, dir: i.dir as string, approvalStatus: i.approvalStatus as string })),
    research: docs.map(d => ({
      id: d.id,
      ideaId: d.ideaId,
      status: d.status as string,
      ticker: d.idea?.ticker,
      dir: d.idea?.dir as string,
      completionScore: d.completionScore,
      qualityScore: d.qualityScore,
      updatedAt: d.updatedAt.toISOString(),
    })),
    comments: comments.map(c => ({
      id: c.id,
      docId: c.docId,
      ideaId: c.doc?.ideaId,
      ticker: c.doc?.idea?.ticker,
      content: c.content.slice(0, 200),
      authorId: c.authorId,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

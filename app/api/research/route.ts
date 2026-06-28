import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function serializeDoc(doc: Record<string, unknown>) {
  return {
    ...doc,
    status: doc.status as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
    lastEditedAt: doc.lastEditedAt ? (doc.lastEditedAt as Date).toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const authorId = req.nextUrl.searchParams.get('authorId');
  const weekId = req.nextUrl.searchParams.get('weekId');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (authorId) where.authorId = authorId;

  const docs = await prisma.researchDoc.findMany({
    where: weekId
      ? { ...where, idea: { weekId } }
      : where,
    include: {
      idea: { select: { ticker: true, dir: true, approvalStatus: true, weekId: true, authorId: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(docs.map(d => serializeDoc(d as unknown as Record<string, unknown>)));
}

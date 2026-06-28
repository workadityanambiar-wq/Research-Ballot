import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.researchDoc.findUnique({ where: { ideaId: id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const field = req.nextUrl.searchParams.get('field');
  const versions = await prisma.researchVersion.findMany({
    where: { docId: doc.id, ...(field ? { field } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const authorIds: string[] = [...new Set(versions.map(v => v.authorId))];
  const users = await prisma.user.findMany({
    where: { legacyId: { in: authorIds } },
    select: { legacyId: true, displayName: true },
  });
  const nameMap = Object.fromEntries(users.map(u => [u.legacyId, u.displayName]));

  return NextResponse.json(versions.map(v => ({
    ...v,
    authorName: nameMap[v.authorId] ?? v.authorId,
    createdAt: v.createdAt.toISOString(),
  })));
}

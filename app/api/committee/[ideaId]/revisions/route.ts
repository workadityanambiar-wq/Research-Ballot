import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const doc = await prisma.researchDoc.findUnique({ where: { ideaId } });
  if (!doc) return NextResponse.json([]);

  const revisions = await prisma.researchRevisionRecord.findMany({
    where: { docId: doc.id },
    orderBy: { revisionNum: 'desc' },
  });

  return NextResponse.json(revisions.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const doc = await prisma.researchDoc.findUnique({ where: { ideaId } });
  if (!doc) return NextResponse.json({ error: 'Research doc not found' }, { status: 404 });

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the research author, CIO, or PM can submit revisions
  if (doc.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { summary, changes } = body;
  if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 });

  const existing = await prisma.researchRevisionRecord.count({ where: { docId: doc.id } });

  const revision = await prisma.researchRevisionRecord.create({
    data: {
      docId: doc.id,
      revisionNum: existing + 1,
      summary: summary as string,
      changes: (changes as string) ?? null,
      submittedBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'RESEARCH_REVISION_SUBMITTED', detail: `Revision #${revision.revisionNum} submitted for ${ideaId}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...revision, createdAt: revision.createdAt.toISOString() }, { status: 201 });
}

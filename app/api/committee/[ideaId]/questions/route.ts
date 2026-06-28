import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;
  const status = req.nextUrl.searchParams.get('status');

  const qs = await prisma.committeeQuestion.findMany({
    where: { ideaId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(qs.map(q => ({
    ...q,
    answeredAt: q.answeredAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { question, priority, assignedTo } = body;
  if (!question || typeof question !== 'string') return NextResponse.json({ error: 'question required' }, { status: 400 });

  const q = await prisma.committeeQuestion.create({
    data: {
      ideaId, question,
      priority: (priority as string) ?? 'MEDIUM',
      assignedTo: (assignedTo as string) ?? null,
      raisedBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'COMMITTEE_QUESTION_RAISED', detail: `Question raised on ${ideaId}: ${question.slice(0, 80)}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...q, answeredAt: null, createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString() }, { status: 201 });
}

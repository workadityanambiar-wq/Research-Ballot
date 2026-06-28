import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const challenges = await prisma.committeeChallenge.findMany({
    where: { ideaId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(challenges.map(c => ({
    ...c, resolvedAt: c.resolvedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
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

  const { category, description, evidence, priority } = body;
  if (!category || !description) return NextResponse.json({ error: 'category and description required' }, { status: 400 });

  const c = await prisma.committeeChallenge.create({
    data: {
      ideaId, category: category as string, description: description as string,
      evidence: (evidence as string) ?? null, priority: (priority as string) ?? 'MEDIUM',
      raisedBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'COMMITTEE_CHALLENGE_RAISED', detail: `Challenge [${category}] on ${ideaId}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...c, resolvedAt: null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }, { status: 201 });
}

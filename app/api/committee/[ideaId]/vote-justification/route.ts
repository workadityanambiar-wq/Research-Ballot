import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const all = req.nextUrl.searchParams.get('all') === '1';

  if (all) {
    const justifications = await prisma.voteJustification.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json(justifications.map(j => ({ ...j, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString() })));
  }

  const j = await prisma.voteJustification.findUnique({ where: { ideaId_userId: { ideaId, userId: user.legacyId } } });
  return NextResponse.json(j ? { ...j, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString() } : null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { decision, summary, keyStrengths, keyConcerns, conditions, additionalNotes } = body;
  if (!decision || !summary) return NextResponse.json({ error: 'decision and summary required' }, { status: 400 });

  const j = await prisma.voteJustification.upsert({
    where: { ideaId_userId: { ideaId, userId: user.legacyId } },
    update: { decision: decision as string, summary: summary as string, keyStrengths: (keyStrengths as string) ?? null, keyConcerns: (keyConcerns as string) ?? null, conditions: (conditions as string) ?? null, additionalNotes: (additionalNotes as string) ?? null },
    create: { ideaId, userId: user.legacyId, decision: decision as string, summary: summary as string, keyStrengths: (keyStrengths as string) ?? null, keyConcerns: (keyConcerns as string) ?? null, conditions: (conditions as string) ?? null, additionalNotes: (additionalNotes as string) ?? null },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'VOTE_JUSTIFICATION_SUBMITTED', detail: `Vote justification submitted for ${ideaId}: ${decision}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...j, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString() });
}

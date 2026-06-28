import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function serialize(pm: Record<string, unknown>) {
  return {
    ...pm,
    createdAt: (pm.createdAt as Date).toISOString(),
    updatedAt: (pm.updatedAt as Date).toISOString(),
    entryDate: pm.entryDate ? (pm.entryDate as Date).toISOString() : null,
    exitDate: pm.exitDate ? (pm.exitDate as Date).toISOString() : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;
  const pm = await prisma.postMortem.findUnique({ where: { ideaId } });
  if (!pm) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(pm as unknown as Record<string, unknown>));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  if (idea.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.postMortem.findUnique({ where: { ideaId } });
  if (existing) return NextResponse.json({ error: 'Post mortem already exists' }, { status: 409 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const pm = await prisma.postMortem.create({
    data: {
      ideaId,
      authorId: user.legacyId,
      entryDate: body.entryDate ? new Date(String(body.entryDate)) : null,
      exitDate: body.exitDate ? new Date(String(body.exitDate)) : null,
      entryPrice: body.entryPrice ? Number(body.entryPrice) : null,
      exitPrice: body.exitPrice ? Number(body.exitPrice) : null,
      actualReturn: body.actualReturn ? Number(body.actualReturn) : null,
      maxDrawdown: body.maxDrawdown ? Number(body.maxDrawdown) : null,
      holdDays: body.holdDays ? Number(body.holdDays) : null,
      originalThesis: body.originalThesis ? String(body.originalThesis) : idea.thesis,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'POST_MORTEM_CREATED', detail: `Post mortem created for ${ideaId}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json(serialize(pm as unknown as Record<string, unknown>), { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;
  const pm = await prisma.postMortem.findUnique({ where: { ideaId } });
  if (!pm) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (pm.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const textFields = ['originalThesis', 'whatWorked', 'whatFailed', 'mistakes', 'lessonsLearned', 'futureAction', 'committeeNotes'];
  const numFields = ['entryPrice', 'exitPrice', 'actualReturn', 'maxDrawdown'];
  const intFields = ['holdDays', 'rating'];
  const dateFields = ['entryDate', 'exitDate'];

  const update: Record<string, unknown> = {};
  for (const f of textFields) if (f in body) update[f] = body[f] ? String(body[f]) : null;
  for (const f of numFields) if (f in body) update[f] = body[f] !== null ? Number(body[f]) : null;
  for (const f of intFields) if (f in body) update[f] = body[f] !== null ? Number(body[f]) : null;
  for (const f of dateFields) if (f in body) update[f] = body[f] ? new Date(String(body[f])) : null;

  const updated = await prisma.postMortem.update({ where: { ideaId }, data: update });
  return NextResponse.json(serialize(updated as unknown as Record<string, unknown>));
}

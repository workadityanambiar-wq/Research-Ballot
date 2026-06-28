import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if ('status' in body) update.status = body.status;
  if ('priority' in body) update.priority = body.priority;
  if ('assignedTo' in body) update.assignedTo = body.assignedTo;

  if ('answer' in body && body.answer) {
    update.answer = body.answer;
    update.answeredBy = user.legacyId;
    update.answeredAt = new Date();
    update.status = 'ANSWERED';
  }

  const q = await prisma.committeeQuestion.update({ where: { id }, data: update });
  return NextResponse.json({ ...q, answeredAt: q.answeredAt?.toISOString() ?? null, createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString() });
}

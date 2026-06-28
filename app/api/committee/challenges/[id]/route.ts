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
  if ('evidence' in body) update.evidence = body.evidence;

  if ('resolution' in body && body.resolution) {
    update.resolution = body.resolution;
    update.resolvedBy = user.legacyId;
    update.resolvedAt = new Date();
    if (!('status' in body)) update.status = 'ADDRESSED';
    prisma.auditLog.create({
      data: { userId: user.id, action: 'COMMITTEE_CHALLENGE_RESOLVED', detail: `Challenge ${id} resolved`, risk: 'LOW' },
    }).catch(() => {});
  }

  const c = await prisma.committeeChallenge.update({ where: { id }, data: update });
  return NextResponse.json({ ...c, resolvedAt: c.resolvedAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() });
}

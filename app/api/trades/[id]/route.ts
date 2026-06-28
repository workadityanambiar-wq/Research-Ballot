import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const trade = await prisma.trade.findUnique({
    where: { id, deletedAt: null },
    include: {
      idea: true,
      position: true,
      executions: { orderBy: { executedAt: 'asc' } },
      journal: { orderBy: { field: 'asc' } },
      history: { orderBy: { createdAt: 'asc' } },
      alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      attribution: true,
    },
  });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serializeFull(trade));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const trade = await prisma.trade.findUnique({ where: { id, deletedAt: null } });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const ALLOWED = [
    'side', 'exchange', 'currency', 'strategy', 'timeHorizon', 'convictionLevel', 'holdingPeriod',
    'entryPrice', 'stopLoss', 'target1', 'target2', 'target3', 'riskReward', 'positionSize',
    'maxCapital', 'maxExposurePct', 'tradeRationale', 'cioNotes', 'pmNotes', 'executionNotes',
  ];

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  // CIO-only: approve proposal
  if ('status' in body && body.status === 'APPROVED' && user.role === 'CIO') {
    update.status = 'APPROVED';
    update.approvedBy = user.legacyId;
    update.approvedAt = new Date();

    prisma.auditLog.create({
      data: { userId: user.id, action: 'TRADE_PROPOSAL_APPROVED', detail: `Trade ${id} approved by ${user.legacyId}`, risk: 'MEDIUM' },
    }).catch(() => {});
    prisma.positionHistory.create({
      data: { tradeId: id, eventType: 'APPROVED', description: `Trade proposal approved by ${user.legacyId}`, createdBy: user.legacyId },
    }).catch(() => {});
  }

  // CIO-only: cancel
  if ('status' in body && body.status === 'CANCELLED' && user.role === 'CIO') {
    update.status = 'CANCELLED';
    update.closedAt = new Date();
    prisma.auditLog.create({
      data: { userId: user.id, action: 'TRADE_CANCELLED', detail: `Trade ${id} cancelled`, risk: 'MEDIUM' },
    }).catch(() => {});
  }

  const updated = await prisma.trade.update({ where: { id }, data: update });
  return NextResponse.json({ ...updated, status: updated.status as string, updatedAt: updated.updatedAt.toISOString() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeFull(t: any) {
  const serDt = (d: Date | null | undefined) => d?.toISOString?.() ?? null;
  return {
    ...t,
    status: t.status as string,
    proposedAt: t.proposedAt?.toISOString?.() ?? t.proposedAt,
    approvedAt: serDt(t.approvedAt),
    closedAt: serDt(t.closedAt),
    createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
    updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
    idea: t.idea ? {
      ...t.idea,
      dir: t.idea.dir as string,
      approvalStatus: t.idea.approvalStatus as string,
      submittedAt: t.idea.submittedAt?.toISOString?.() ?? t.idea.submittedAt,
      createdAt: t.idea.createdAt?.toISOString?.() ?? t.idea.createdAt,
      updatedAt: t.idea.updatedAt?.toISOString?.() ?? t.idea.updatedAt,
    } : null,
    position: t.position ? {
      ...t.position,
      entryDate: t.position.entryDate?.toISOString?.() ?? t.position.entryDate,
      exitDate: serDt(t.position.exitDate),
      lastPriceUpdate: serDt(t.position.lastPriceUpdate),
      createdAt: t.position.createdAt?.toISOString?.() ?? t.position.createdAt,
      updatedAt: t.position.updatedAt?.toISOString?.() ?? t.position.updatedAt,
    } : null,
    executions: (t.executions ?? []).map((e: Record<string, unknown>) => ({
      ...e, type: e.type as string,
      executedAt: (e.executedAt as Date)?.toISOString?.() ?? e.executedAt,
      createdAt: (e.createdAt as Date)?.toISOString?.() ?? e.createdAt,
    })),
    journal: (t.journal ?? []).map((j: Record<string, unknown>) => ({
      ...j,
      createdAt: (j.createdAt as Date)?.toISOString?.() ?? j.createdAt,
      updatedAt: (j.updatedAt as Date)?.toISOString?.() ?? j.updatedAt,
    })),
    history: (t.history ?? []).map((h: Record<string, unknown>) => ({
      ...h, createdAt: (h.createdAt as Date)?.toISOString?.() ?? h.createdAt,
    })),
    alerts: (t.alerts ?? []).map((a: Record<string, unknown>) => ({
      ...a, alertType: a.alertType as string,
      readAt: serDt(a.readAt as Date | null),
      createdAt: (a.createdAt as Date)?.toISOString?.() ?? a.createdAt,
    })),
    attribution: t.attribution ? {
      ...t.attribution,
      createdAt: t.attribution.createdAt?.toISOString?.() ?? t.attribution.createdAt,
      updatedAt: t.attribution.updatedAt?.toISOString?.() ?? t.attribution.updatedAt,
    } : null,
  };
}

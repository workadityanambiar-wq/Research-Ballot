import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const attr = await prisma.performanceAttribution.findUnique({ where: { tradeId: id } });
  if (!attr) return NextResponse.json(null);
  return NextResponse.json({ ...attr, createdAt: attr.createdAt.toISOString(), updatedAt: attr.updatedAt.toISOString() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const trade = await prisma.trade.findUnique({ where: { id, deletedAt: null } });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const SCORE_FIELDS = ['researchQuality', 'entryTiming', 'exitTiming', 'catalystOutcome', 'riskMgmt', 'positionSizing', 'executionQuality'];
  const TEXT_FIELDS = ['analystComment', 'pmComment', 'cioComment'];

  const data: Record<string, unknown> = {};
  for (const f of SCORE_FIELDS) { if (f in body) data[f] = typeof body[f] === 'number' ? body[f] : parseInt(body[f] as string); }
  for (const f of TEXT_FIELDS) { if (f in body) data[f] = body[f]; }

  const attr = await prisma.performanceAttribution.upsert({
    where: { tradeId: id },
    update: data,
    create: { tradeId: id, ...data },
  });

  return NextResponse.json({ ...attr, createdAt: attr.createdAt.toISOString(), updatedAt: attr.updatedAt.toISOString() });
}

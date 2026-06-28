import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const journal = await prisma.tradeJournal.findMany({
    where: { tradeId: id },
    orderBy: { field: 'asc' },
  });

  return NextResponse.json(journal.map(j => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  })));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const trade = await prisma.trade.findUnique({ where: { id, deletedAt: null } });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const ALLOWED_FIELDS = ['originalThesis', 'entryReason', 'exitReason', 'marketContext', 'analystComment', 'pmComment', 'cioComment', 'lessonsLearned'];
  const ops = [];
  for (const field of ALLOWED_FIELDS) {
    if (field in body && typeof body[field] === 'string') {
      ops.push(
        prisma.tradeJournal.upsert({
          where: { tradeId_field: { tradeId: id, field } },
          update: { content: body[field], authorId: user.legacyId, authorRole: user.role },
          create: { tradeId: id, field, content: body[field], authorId: user.legacyId, authorRole: user.role },
        })
      );
    }
  }

  if (ops.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  await prisma.$transaction(ops);

  prisma.auditLog.create({
    data: { userId: user.id, action: 'TRADE_JOURNAL_UPDATED', detail: `Journal updated for trade ${id}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ updated: true });
}

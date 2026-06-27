import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (sessionUser.role !== 'CIO' && sessionUser.role !== 'PM') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { action } = body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const approvalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  const idea = await prisma.idea.update({
    where: { id },
    data: { approvalStatus: approvalStatus as 'APPROVED' | 'REJECTED' },
  });

  await prisma.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: 'TRADE_APPROVED',
      detail: `${id} ${idea.ticker} ${idea.dir} ${action}d`,
      risk: 'LOW',
    },
  });

  return NextResponse.json({ success: true, approvalStatus });
}

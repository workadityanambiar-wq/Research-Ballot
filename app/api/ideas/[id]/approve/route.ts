import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'CIO' && userRole !== 'PM') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { action } = body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const approvalStatus = action === 'approve' ? 'APPROVED' : ('REJECTED' as const);

  const idea = await prisma.idea.update({
    where: { id },
    data: { approvalStatus: approvalStatus as 'APPROVED' | 'REJECTED' },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id: string }).id,
      action: 'TRADE_APPROVED',
      detail: `${id} ${idea.ticker} ${idea.dir} ${action}d`,
      risk: 'LOW',
    },
  });

  return NextResponse.json({ success: true, approvalStatus });
}

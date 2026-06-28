import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function pinOk(submitted: string): boolean {
  const expected = process.env.APPROVAL_PIN ?? '2025';
  // Reject wrong-length pins before timing-safe compare to avoid length oracle
  if (submitted.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (sessionUser.role !== 'CIO' && sessionUser.role !== 'PM') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: string; pin?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { action, pin } = body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Server-side PIN validation — client never bypasses this
  if (!pin || !pinOk(pin)) {
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'PERMISSION_CHANGE',
        detail: `INVALID PIN for ${action} on ${id} — access denied`,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        risk: 'HIGH',
      },
    });
    return NextResponse.json({ error: 'Invalid PIN.' }, { status: 403 });
  }

  const idea = await prisma.idea.update({
    where: { id },
    data: { approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED' },
  });

  await prisma.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: 'TRADE_APPROVED',
      detail: `${id} ${idea.ticker} ${idea.dir} ${action}d`,
      risk: 'LOW',
    },
  });

  return NextResponse.json({ success: true, approvalStatus: idea.approvalStatus });
}

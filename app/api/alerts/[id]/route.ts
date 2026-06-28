import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const alert = await prisma.tradeAlert.update({
    where: { id },
    data: { isRead: true, readAt: new Date(), readBy: user.legacyId },
  });

  return NextResponse.json({ ...alert, alertType: alert.alertType as string, readAt: alert.readAt?.toISOString() ?? null, createdAt: alert.createdAt.toISOString() });
}

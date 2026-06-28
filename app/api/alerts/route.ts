import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1';

  const alerts = await prisma.tradeAlert.findMany({
    where: unreadOnly ? { isRead: false } : {},
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      trade: { select: { id: true, idea: { select: { ticker: true } } } },
    },
  });

  return NextResponse.json(alerts.map(a => ({
    ...a,
    alertType: a.alertType as string,
    readAt: a.readAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    trade: a.trade ? { id: a.trade.id, ticker: a.trade.idea?.ticker ?? '' } : null,
  })));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { tradeId, alertType, message, severity } = body;
  if (!alertType || !message) return NextResponse.json({ error: 'alertType and message required' }, { status: 400 });

  const alert = await prisma.tradeAlert.create({
    data: {
      tradeId: (tradeId as string) ?? null,
      alertType: alertType as never,
      message: message as string,
      severity: (severity as string) ?? 'MEDIUM',
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'TRADE_ALERT_CREATED', detail: `Alert: ${alertType} — ${message}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...alert, alertType: alert.alertType as string, createdAt: alert.createdAt.toISOString() }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10));

  const alerts = await prisma.scannerAlert.findMany({
    where: unreadOnly ? { isRead: false } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      result: {
        select: {
          symbol: true, pattern: true, direction: true,
          tfLabel: true, patternScore: true, classification: true,
        },
      },
    },
  });

  const unreadCount = await prisma.scannerAlert.count({ where: { isRead: false } });

  return NextResponse.json({ alerts, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { ids?: string[]; markAll?: boolean };

  if (body.markAll) {
    await prisma.scannerAlert.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return NextResponse.json({ marked: 'all' });
  }

  if (body.ids?.length) {
    await prisma.scannerAlert.updateMany({
      where: { id: { in: body.ids } },
      data: { isRead: true },
    });
    return NextResponse.json({ marked: body.ids.length });
  }

  return NextResponse.json({ error: 'Provide ids or markAll' }, { status: 400 });
}

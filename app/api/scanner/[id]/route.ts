import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const result = await prisma.scannerResult.findUnique({
    where: { id },
    include: {
      alerts:    { orderBy: { createdAt: 'desc' }, take: 20 },
      watchedBy: { where: { userId: user.id } },
    },
  });
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...result, isWatched: result.watchedBy.length > 0 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({})) as {
    status?: string;
    isStarred?: boolean;
    commentary?: string;
  };

  const allowedStatuses = ['WATCH', 'TRIGGERED', 'CONFIRMED', 'FAILED', 'EXPIRED'];
  const data: Record<string, unknown> = {};
  if (body.status && allowedStatuses.includes(body.status)) data.status = body.status;
  if (typeof body.isStarred === 'boolean') data.isStarred = body.isStarred;
  if (body.commentary !== undefined) data.commentary = body.commentary;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const updated = await prisma.scannerResult.update({ where: { id }, data });

  if (body.status && ['TRIGGERED', 'CONFIRMED', 'FAILED'].includes(body.status)) {
    const labels: Record<string, string> = {
      TRIGGERED: 'BREAKOUT_TRIGGERED',
      CONFIRMED: 'BREAKOUT_CONFIRMED',
      FAILED:    'PATTERN_FAILED',
    };
    await prisma.scannerAlert.create({
      data: {
        resultId:  id,
        alertType: labels[body.status] ?? 'STATUS_CHANGE',
        message:   `${updated.pattern} on ${updated.symbol} status changed to ${body.status}`,
        userId:    user.id,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.scannerWatchlistEntry.findUnique({
    where: { userId_resultId: { userId: user.id, resultId: id } },
  });

  if (existing) {
    await prisma.scannerWatchlistEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ watched: false });
  } else {
    await prisma.scannerWatchlistEntry.create({ data: { userId: user.id, resultId: id } });
    return NextResponse.json({ watched: true });
  }
}

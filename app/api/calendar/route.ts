import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function serialize(e: Record<string, unknown>) {
  return { ...e, date: (e.date as Date).toISOString(), createdAt: (e.createdAt as Date).toISOString() };
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const type = req.nextUrl.searchParams.get('type');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }
  if (type) where.eventType = type;

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { date: 'asc' },
    take: 200,
  });

  return NextResponse.json(events.map(e => serialize(e as unknown as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['CIO', 'PM', 'SR_ANALYST'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, eventType, date, ticker, ideaId, description, importance } = body;
  if (!title || !eventType || !date) {
    return NextResponse.json({ error: 'title, eventType, and date required' }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: String(title),
      eventType: String(eventType),
      date: new Date(String(date)),
      ticker: ticker ? String(ticker).toUpperCase() : null,
      ideaId: ideaId ? String(ideaId) : null,
      description: description ? String(description) : null,
      importance: String(importance ?? 'MEDIUM'),
      createdBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'CALENDAR_EVENT_ADDED', detail: `Calendar event "${String(title)}" on ${date}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json(serialize(event as unknown as Record<string, unknown>), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM', 'SR_ANALYST'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (event.createdBy !== user.legacyId && user.role !== 'CIO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

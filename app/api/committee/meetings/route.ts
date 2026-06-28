import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const meetings = await prisma.committeeMeeting.findMany({
    where: status ? { status } : {},
    orderBy: { meetingDate: 'desc' },
    include: {
      agendaItems: {
        include: { idea: { select: { ticker: true, dir: true, finalScore: true, approvalStatus: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      attendance: true,
    },
  });

  return NextResponse.json(meetings.map(m => ({
    ...m,
    meetingDate: m.meetingDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    agendaItems: m.agendaItems.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      idea: a.idea ? { ...a.idea, dir: a.idea.dir as string, approvalStatus: a.idea.approvalStatus as string } : null,
    })),
  })));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, meetingDate, agenda } = body;
  if (!title || !meetingDate) return NextResponse.json({ error: 'title and meetingDate required' }, { status: 400 });

  const meeting = await prisma.committeeMeeting.create({
    data: {
      title: title as string,
      meetingDate: new Date(meetingDate as string),
      agenda: (agenda as string) ?? null,
      createdBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'MEETING_CREATED', detail: `Meeting "${title}" scheduled for ${meetingDate}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...meeting, meetingDate: meeting.meetingDate.toISOString(), createdAt: meeting.createdAt.toISOString(), updatedAt: meeting.updatedAt.toISOString() }, { status: 201 });
}

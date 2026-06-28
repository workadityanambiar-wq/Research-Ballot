import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const meeting = await prisma.committeeMeeting.findUnique({
    where: { id },
    include: {
      agendaItems: {
        include: {
          idea: {
            select: {
              id: true, ticker: true, dir: true, finalScore: true, approvalStatus: true,
              researchDoc: { select: { id: true, overview: true } },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      attendance: true,
    },
  });

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...meeting,
    meetingDate: meeting.meetingDate.toISOString(),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
    agendaItems: meeting.agendaItems.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      idea: a.idea ? { ...a.idea, dir: a.idea.dir as string, approvalStatus: a.idea.approvalStatus as string } : null,
    })),
    attendance: meeting.attendance.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if ('title' in body) update.title = body.title;
  if ('meetingDate' in body) update.meetingDate = new Date(body.meetingDate as string);
  if ('agenda' in body) update.agenda = body.agenda;
  if ('notes' in body) update.notes = body.notes;
  if ('decisions' in body) update.decisions = body.decisions;
  if ('status' in body) {
    update.status = body.status;
    if (body.status === 'COMPLETED') {
      prisma.auditLog.create({
        data: { userId: user.id, action: 'MEETING_COMPLETED', detail: `Meeting ${id} marked completed`, risk: 'LOW' },
      }).catch(() => {});
    }
  }

  const meeting = await prisma.committeeMeeting.update({ where: { id }, data: update });

  return NextResponse.json({
    ...meeting,
    meetingDate: meeting.meetingDate.toISOString(),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  });
}

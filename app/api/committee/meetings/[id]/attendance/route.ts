import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: meetingId } = await params;

  const existing = await prisma.meetingAttendance.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.legacyId } },
  });

  if (existing) {
    return NextResponse.json({ ...existing, createdAt: existing.createdAt.toISOString() });
  }

  const record = await prisma.meetingAttendance.create({
    data: { meetingId, userId: user.legacyId, role: user.role },
  });

  return NextResponse.json({ ...record, createdAt: record.createdAt.toISOString() }, { status: 201 });
}

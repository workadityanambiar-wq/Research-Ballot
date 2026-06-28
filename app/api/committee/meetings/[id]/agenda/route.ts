import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: meetingId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { ideaId, duration, notes } = body;
  if (!ideaId) return NextResponse.json({ error: 'ideaId required' }, { status: 400 });

  const existing = await prisma.meetingAgendaItem.count({ where: { meetingId } });

  const item = await prisma.meetingAgendaItem.create({
    data: {
      meetingId,
      ideaId: ideaId as string,
      sortOrder: existing + 1,
      duration: (duration as number) ?? null,
      notes: (notes as string) ?? null,
    },
    include: {
      idea: { select: { ticker: true, dir: true, finalScore: true, approvalStatus: true } },
    },
  });

  return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['CIO', 'PM'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: meetingId } = await params;

  const { searchParams } = req.nextUrl;
  const itemId = searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

  await prisma.meetingAgendaItem.deleteMany({ where: { id: itemId, meetingId } });
  return NextResponse.json({ ok: true });
}

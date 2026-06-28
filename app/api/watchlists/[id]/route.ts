import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const wl = await prisma.watchlist.findUnique({ where: { id } });
  if (!wl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (wl.ownerId !== user.legacyId && user.role !== 'CIO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const update: Record<string, unknown> = {};
  if ('name' in body) update.name = String(body.name);
  if ('description' in body) update.description = body.description ? String(body.description) : null;
  if ('isPublic' in body) update.isPublic = Boolean(body.isPublic);
  if ('color' in body) update.color = body.color ? String(body.color) : null;
  const updated = await prisma.watchlist.update({ where: { id }, data: update, include: { items: true } });
  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    items: updated.items.map(i => ({ ...i, addedAt: i.addedAt.toISOString() })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const wl = await prisma.watchlist.findUnique({ where: { id } });
  if (!wl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (wl.ownerId !== user.legacyId && user.role !== 'CIO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.watchlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

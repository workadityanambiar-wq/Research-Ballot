import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { ticker, notes } = body;
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  const item = await prisma.watchlistItem.upsert({
    where: { watchlistId_ticker: { watchlistId: id, ticker: String(ticker).toUpperCase() } },
    create: { watchlistId: id, ticker: String(ticker).toUpperCase(), notes: notes ? String(notes) : null, addedBy: user.legacyId },
    update: { notes: notes ? String(notes) : null },
  });
  return NextResponse.json({ ...item, addedAt: item.addedAt.toISOString() }, { status: 201 });
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
  const ticker = req.nextUrl.searchParams.get('ticker');
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });
  await prisma.watchlistItem.delete({
    where: { watchlistId_ticker: { watchlistId: id, ticker: ticker.toUpperCase() } },
  });
  return NextResponse.json({ ok: true });
}

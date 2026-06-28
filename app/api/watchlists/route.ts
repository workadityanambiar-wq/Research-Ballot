import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function serializeWatchlist(w: Record<string, unknown> & { items?: Record<string, unknown>[] }) {
  return {
    ...w,
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
    items: (w.items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      addedAt: (item.addedAt as Date).toISOString(),
    })),
  };
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const watchlists = await prisma.watchlist.findMany({
    where: { OR: [{ ownerId: user.legacyId }, { isPublic: true }] },
    include: { items: { orderBy: { addedAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(watchlists.map(w => serializeWatchlist(w as unknown as Record<string, unknown> & { items: Record<string, unknown>[] })));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { name, description, isPublic, color } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const watchlist = await prisma.watchlist.create({
    data: {
      name: String(name),
      description: description ? String(description) : null,
      ownerId: user.legacyId,
      isPublic: Boolean(isPublic),
      color: color ? String(color) : null,
    },
    include: { items: true },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'WATCHLIST_CREATED', detail: `Watchlist "${String(name)}" created`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json(serializeWatchlist(watchlist as unknown as Record<string, unknown> & { items: Record<string, unknown>[] }), { status: 201 });
}

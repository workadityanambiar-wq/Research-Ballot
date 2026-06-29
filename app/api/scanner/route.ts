import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const direction  = q.get('direction');
  const category   = q.get('category');
  const timeframe  = q.get('timeframe');
  const assetClass = q.get('assetClass');
  const status     = q.get('status');
  const minScore   = parseFloat(q.get('minScore') || '70');
  const sort       = q.get('sort') || 'patternScore';
  const limit      = Math.min(200, parseInt(q.get('limit') || '100', 10));
  const starred    = q.get('starred') === 'true';

  type Where = {
    direction?: string;
    category?: string;
    timeframe?: string;
    assetClass?: string;
    status?: string;
    patternScore?: { gte: number };
    isStarred?: boolean;
  };

  const where: Where = {
    patternScore: { gte: minScore },
  };
  if (direction)  where.direction  = direction.toUpperCase();
  if (category)   where.category   = category.toUpperCase();
  if (timeframe)  where.timeframe  = timeframe.toUpperCase();
  if (assetClass) where.assetClass = assetClass;
  if (status)     where.status     = status.toUpperCase();
  if (starred)    where.isStarred  = true;

  type OrderBy = Record<string, 'asc' | 'desc'>;
  const SORT_MAP: Record<string, OrderBy> = {
    patternScore:  { patternScore: 'desc' },
    rrRatio:       { rrRatio: 'desc' },
    newest:        { detectedAt: 'desc' },
    rsi:           { rsi: 'asc' },
    adx:           { adx: 'desc' },
    breakoutProb:  { breakoutProb: 'desc' },
  };
  const orderBy = SORT_MAP[sort] ?? { patternScore: 'desc' };

  const results = await prisma.scannerResult.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      _count: { select: { alerts: true, watchedBy: true } },
    },
  });

  // Stats summary
  const stats = await prisma.scannerResult.groupBy({
    by: ['direction'],
    where: { patternScore: { gte: minScore } },
    _count: { id: true },
  });

  return NextResponse.json({ results, stats, total: results.length });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Only CIO/PM can purge old results
  if (user.role !== 'CIO' && user.role !== 'PM')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const olderThanHours = parseInt(req.nextUrl.searchParams.get('hours') || '48', 10);
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const del = await prisma.scannerResult.deleteMany({
    where: { detectedAt: { lt: cutoff }, status: { in: ['WATCH', 'FAILED', 'EXPIRED'] } },
  });
  return NextResponse.json({ deleted: del.count });
}

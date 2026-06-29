import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    totalDetected,
    byDirection,
    byCategory,
    byTimeframe,
    byClassification,
    byStatus,
    recent,
  ] = await Promise.all([
    prisma.scannerResult.count(),
    prisma.scannerResult.groupBy({ by: ['direction'], _count: { id: true }, _avg: { patternScore: true } }),
    prisma.scannerResult.groupBy({ by: ['category'], _count: { id: true }, _avg: { patternScore: true } }),
    prisma.scannerResult.groupBy({ by: ['timeframe'], _count: { id: true }, _avg: { patternScore: true } }),
    prisma.scannerResult.groupBy({ by: ['classification'], _count: { id: true } }),
    prisma.scannerResult.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.scannerResult.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 5,
      select: {
        symbol: true, pattern: true, tfLabel: true,
        patternScore: true, classification: true, direction: true, detectedAt: true,
      },
    }),
  ]);

  const logs = await prisma.scannerPerformanceLog.findMany({
    where: { success: { not: null } },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  type PerfLog = typeof logs[number];
  const winRate = logs.length
    ? (logs.filter((l: PerfLog) => l.success).length / logs.length * 100).toFixed(1)
    : null;

  const withReturn = logs.filter((l: PerfLog) => l.returnPct !== null);
  const avgReturn = withReturn.length
    ? (withReturn.reduce((s: number, l: PerfLog) => s + (l.returnPct ?? 0), 0) / withReturn.length).toFixed(2)
    : null;

  return NextResponse.json({
    totalDetected,
    byDirection,
    byCategory,
    byTimeframe,
    byClassification,
    byStatus,
    recent,
    performance: { winRate, avgReturn, totalTrades: logs.length },
  });
}

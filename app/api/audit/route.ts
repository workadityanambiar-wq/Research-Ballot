import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function fmtTs(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (sessionUser.role !== 'CIO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 500);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const action = url.searchParams.get('action');

  const where = action ? { action: action as never } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { legacyId: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    entries: logs.map(e => ({
      id: e.id,
      ts: fmtTs(e.createdAt),
      userId: e.user?.legacyId ?? e.userId ?? '—',
      action: e.action as string,
      detail: e.detail,
      ip: e.ipAddress ?? '—',
      dev: e.device ?? '—',
      risk: e.risk as 'HIGH' | 'MEDIUM' | 'LOW',
    })),
    total,
  });
}

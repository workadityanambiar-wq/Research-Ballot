import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

function parseDev(ua: string | null | undefined): string {
  if (!ua || ua === 'unknown') return 'Unknown';
  if (ua.includes('Postman')) return 'Postman';
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown OS';
  return `${os} / ${browser}`;
}

function relTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (sessionUser.role !== 'CIO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();

  const [sessions, mfaEnrolledCount, blockedCount, totalUsers] = await Promise.all([
    prisma.session.findMany({
      where: { expires: { gt: now } },
      include: {
        user: {
          select: { legacyId: true, displayName: true, role: true, mfaEnabled: true, lockedUntil: true },
        },
      },
      orderBy: { lastActiveAt: 'desc' },
    }),
    prisma.user.count({ where: { mfaEnabled: true } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
    prisma.user.count(),
  ]);

  const mappedSessions = sessions.map(s => {
    const u = s.user;
    const isBlocked = u.lockedUntil != null && u.lockedUntil > now;
    const minsAgo = Math.floor((now.getTime() - s.lastActiveAt.getTime()) / 60_000);
    const status: 'ACTIVE' | 'IDLE' | 'BLOCKED' = isBlocked ? 'BLOCKED' : minsAgo >= 30 ? 'IDLE' : 'ACTIVE';
    const unknownDev = !s.userAgent || s.userAgent === 'unknown';
    const risk = Math.min(100,
      5 +
      (u.mfaEnabled ? 0 : 40) +
      (isBlocked ? 30 : 0) +
      (unknownDev ? 15 : 0) +
      (minsAgo >= 60 ? 10 : minsAgo >= 30 ? 5 : 0),
    );

    return {
      userId: u.legacyId,
      name: u.displayName,
      role: u.role as string,
      ip: s.ipAddress ?? '—',
      dev: parseDev(s.userAgent),
      lastAct: relTime(s.lastActiveAt),
      status,
      mfa: u.mfaEnabled,
      risk,
    };
  });

  return NextResponse.json({
    sessions: mappedSessions,
    stats: {
      activeSessions: sessions.length,
      mfaEnrolledCount,
      totalUsers,
      blockedCount,
    },
  });
}

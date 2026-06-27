import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WEEK_ID, IDEA_LIMIT_PER_WEEK } from '@/lib/data';
import { computeScores } from '@/lib/scoring';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekId = req.nextUrl.searchParams.get('weekId') ?? WEEK_ID;
  const ideas = await prisma.idea.findMany({
    where: { weekId },
    orderBy: { finalScore: 'desc' },
  });

  return NextResponse.json(ideas.map(idea => ({
    ...idea,
    dir: idea.dir as string,
    approvalStatus: idea.approvalStatus as string,
    submittedAt: idea.submittedAt.toISOString(),
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const legacyId = sessionUser.legacyId;

  const count = await prisma.idea.count({ where: { authorId: legacyId, weekId: WEEK_ID } });
  if (count >= IDEA_LIMIT_PER_WEEK) {
    return NextResponse.json({ error: 'Weekly limit reached' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { ticker, assetClass, dir, entry, stop, target, hold, posSize, conv, expRet, expDD, thesis, catalysts, risks, imageUrl } = body;

  if (!ticker || !entry || !stop || !target || !thesis) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const entryNum = parseFloat(String(entry));
  const stopNum = parseFloat(String(stop));
  const targetNum = parseFloat(String(target));
  const rrNum = Math.max(0, (targetNum - entryNum) / Math.abs(entryNum - stopNum));

  const totalCount = await prisma.idea.count();
  const nextId = `IDEA-${String(totalCount + 1).padStart(3, '0')}`;

  const authorUser = await prisma.user.findUnique({ where: { legacyId }, select: { ideaScore: true } });
  const authorIdeaScore = authorUser?.ideaScore ?? 50;

  const scores = computeScores({
    conv: Number(conv) || 7,
    expRet: parseFloat(String(expRet)) || 0,
    rr: rrNum,
    authorIdeaScore,
    totalCredits: 0,
    maxCreditsAnyIdea: 1,
  });

  const idea = await prisma.idea.create({
    data: {
      id: nextId,
      ticker: String(ticker).toUpperCase(),
      assetClass: String(assetClass || 'US Equities'),
      dir: String(dir) as 'LONG' | 'SHORT',
      entry: entryNum,
      stop: stopNum,
      target: targetNum,
      hold: String(hold || '1-3M'),
      posSize: parseFloat(String(posSize)) || 1,
      conv: Number(conv) || 7,
      expRet: parseFloat(String(expRet)) || 0,
      expDD: parseFloat(String(expDD)) || 0,
      rr: rrNum,
      thesis: String(thesis),
      catalysts: Array.isArray(catalysts) ? (catalysts as string[]) : String(catalysts || '').split('\n').filter(Boolean),
      risks: Array.isArray(risks) ? (risks as string[]) : String(risks || '').split('\n').filter(Boolean),
      authorId: legacyId,
      weekId: WEEK_ID,
      imageUrl: imageUrl ? String(imageUrl) : null,
      ...scores,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: 'IDEA_SUBMITTED',
      detail: `${nextId} submitted (${String(ticker).toUpperCase()} ${String(dir)} / Conv:${conv} / RR:${rrNum.toFixed(2)})`,
      risk: 'LOW',
    },
  });

  return NextResponse.json({
    ...idea,
    dir: idea.dir as string,
    approvalStatus: idea.approvalStatus as string,
    submittedAt: idea.submittedAt.toISOString(),
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  }, { status: 201 });
}

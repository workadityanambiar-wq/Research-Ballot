import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const [doc, openChallenges, openQuestions] = await Promise.all([
    prisma.researchDoc.findUnique({
      where: { ideaId },
      include: { catalysts: true, risks: true, attachments: { where: { deletedAt: null } }, references: true },
    }),
    prisma.committeeChallenge.count({ where: { ideaId, status: 'OPEN' } }),
    prisma.committeeQuestion.count({ where: { ideaId, status: 'OPEN' } }),
  ]);

  const checklist = [
    { key: 'overview', label: 'Executive Summary', done: !!(doc?.overview), weight: 5 },
    { key: 'thesis', label: 'Investment Thesis (200+ chars)', done: !!(doc?.thesis && doc.thesis.length > 200), weight: 15 },
    { key: 'financials', label: 'Financial Analysis', done: !!(doc?.financials && doc.financials.length > 100), weight: 15 },
    { key: 'valuation', label: 'Valuation Analysis', done: !!(doc?.valuation && doc.valuation.length > 100), weight: 15 },
    { key: 'technical', label: 'Technical Analysis', done: !!(doc?.technical && doc.technical.length > 50), weight: 5 },
    { key: 'catalysts', label: 'Catalysts (2+)', done: (doc?.catalysts.length ?? 0) >= 2, weight: 15 },
    { key: 'risks', label: 'Risk Analysis (2+)', done: (doc?.risks.length ?? 0) >= 2, weight: 10 },
    { key: 'attachments', label: 'Supporting Documents', done: (doc?.attachments.length ?? 0) > 0, weight: 10 },
    { key: 'references', label: 'References', done: (doc?.references.length ?? 0) > 0, weight: 5 },
    { key: 'noChallenges', label: 'No Open Challenges', done: openChallenges === 0, weight: 5 },
  ];

  const score = checklist.filter(c => c.done).reduce((s, c) => s + c.weight, 0);
  const maxScore = checklist.reduce((s, c) => s + c.weight, 0);

  return NextResponse.json({
    score,
    maxScore,
    pct: Math.round((score / maxScore) * 100),
    checklist,
    openChallenges,
    openQuestions,
    ready: score >= 80,
  });
}

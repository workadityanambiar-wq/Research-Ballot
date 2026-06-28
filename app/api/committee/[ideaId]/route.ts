import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ideaId } = await params;

  const [idea, researchDoc, questions, challenges, justifications, revisions, meetings] = await Promise.all([
    prisma.idea.findUnique({ where: { id: ideaId }, include: { quantScoreData: true } }),
    prisma.researchDoc.findUnique({
      where: { ideaId },
      include: {
        catalysts: true, risks: true, attachments: { where: { deletedAt: null } },
        references: true, revisionRecords: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.committeeQuestion.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.committeeChallenge.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.voteJustification.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } }),
    prisma.researchRevisionRecord.findMany({ where: { doc: { ideaId } }, orderBy: { revisionNum: 'desc' } }),
    prisma.meetingAgendaItem.findMany({
      where: { ideaId },
      orderBy: { createdAt: 'desc' },
      include: { meeting: true },
    }),
  ]);

  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const serDt = (d: Date | null | undefined) => d?.toISOString?.() ?? null;
  const qs = idea.quantScoreData;
  const serIdea = {
    ...idea,
    dir: idea.dir as string,
    approvalStatus: idea.approvalStatus as string,
    submittedAt: idea.submittedAt.toISOString(),
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    quantScoreData: qs ? {
      ...qs,
      calculatedAt: qs.calculatedAt.toISOString(),
      createdAt: qs.createdAt.toISOString(),
      updatedAt: qs.updatedAt.toISOString(),
    } : null,
  };

  return NextResponse.json({
    idea: serIdea,
    researchDoc: researchDoc ? {
      ...researchDoc,
      status: researchDoc.status as string,
      createdAt: researchDoc.createdAt.toISOString(),
      updatedAt: researchDoc.updatedAt.toISOString(),
      lastEditedAt: serDt(researchDoc.lastEditedAt),
      catalysts: researchDoc.catalysts.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
      risks: researchDoc.risks.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
      attachments: researchDoc.attachments.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
      references: researchDoc.references.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      revisionRecords: researchDoc.revisionRecords.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    } : null,
    questions: questions.map(q => ({ ...q, answeredAt: serDt(q.answeredAt), createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString() })),
    challenges: challenges.map(c => ({ ...c, resolvedAt: serDt(c.resolvedAt), createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
    voteJustifications: justifications.map(j => ({ ...j, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString() })),
    revisions,
    meetings: meetings.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      meeting: m.meeting ? {
        ...m.meeting,
        meetingDate: m.meeting.meetingDate.toISOString(),
        createdAt: m.meeting.createdAt.toISOString(),
        updatedAt: m.meeting.updatedAt.toISOString(),
      } : null,
    })),
  });
}

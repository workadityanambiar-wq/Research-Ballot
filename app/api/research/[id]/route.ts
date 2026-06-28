import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

const TEXT_FIELDS = ['thesis', 'financials', 'valuation', 'technical', 'overview'] as const;

function computeScores(doc: {
  thesis: string | null; financials: string | null; valuation: string | null;
  technical: string | null; overview: string | null;
}, catalystCount: number, riskCount: number, attachCount: number, refCount: number) {
  const filled = [
    !!doc.overview,
    doc.thesis && doc.thesis.length > 100,
    doc.financials && doc.financials.length > 80,
    doc.valuation && doc.valuation.length > 80,
    doc.technical && doc.technical.length > 50,
    catalystCount > 0,
    riskCount > 0,
    attachCount > 0,
  ];
  const completionScore = Math.round((filled.filter(Boolean).length / filled.length) * 100);

  let qualityScore = 0;
  if (doc.thesis && doc.thesis.length > 300) qualityScore += 20;
  else if (doc.thesis && doc.thesis.length > 100) qualityScore += 10;
  if (doc.financials && doc.financials.length > 200) qualityScore += 20;
  else if (doc.financials && doc.financials.length > 80) qualityScore += 10;
  if (doc.valuation && doc.valuation.length > 200) qualityScore += 20;
  else if (doc.valuation && doc.valuation.length > 80) qualityScore += 10;
  if (catalystCount >= 3) qualityScore += 15;
  else if (catalystCount >= 1) qualityScore += 8;
  if (riskCount >= 2) qualityScore += 10;
  else if (riskCount >= 1) qualityScore += 5;
  if (refCount >= 2) qualityScore += 10;
  else if (refCount >= 1) qualityScore += 5;
  if (attachCount > 0) qualityScore += 5;

  return { completionScore, qualityScore: Math.min(100, qualityScore) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let doc = await prisma.researchDoc.findUnique({
    where: { ideaId: id },
    include: {
      idea: true,
      catalysts: { orderBy: { sortOrder: 'asc' } },
      risks: { orderBy: { sortOrder: 'asc' } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      references: { orderBy: { createdAt: 'desc' } },
      comments: {
        where: { deletedAt: null, parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      versions: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  // Auto-create if idea exists but no doc yet
  if (!doc) {
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc = await prisma.researchDoc.create({
      data: { ideaId: id, authorId: idea.authorId, status: 'DRAFT' },
      include: {
        idea: true,
        catalysts: true, risks: true, attachments: true,
        references: true, comments: { include: { replies: true } },
        versions: true,
      },
    }) as any;
  }

  return NextResponse.json(serializeFullDoc(doc));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const doc = await prisma.researchDoc.findUnique({
    where: { ideaId: id },
    include: { catalysts: true, risks: true, attachments: { where: { deletedAt: null } }, references: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Permission: author or CIO/PM can edit
  if (doc.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const update: Record<string, unknown> = {
    lastEditedBy: user.legacyId,
    lastEditedAt: new Date(),
  };

  // Handle text field updates
  for (const field of TEXT_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  // Handle status update
  if ('status' in body) update.status = body.status;

  // Compute new scores
  const updatedDoc = { ...doc, ...update };
  const { completionScore, qualityScore } = computeScores(
    updatedDoc as { thesis: string | null; financials: string | null; valuation: string | null; technical: string | null; overview: string | null },
    doc.catalysts.length,
    doc.risks.length,
    doc.attachments.length,
    doc.references.length,
  );
  update.completionScore = completionScore;
  update.qualityScore = qualityScore;

  // Save version snapshot for text fields
  const versionOps = [];
  for (const field of TEXT_FIELDS) {
    if (field in body && typeof body[field] === 'string') {
      versionOps.push(
        prisma.researchVersion.create({
          data: { docId: doc.id, field, content: body[field] as string, authorId: user.legacyId },
        }),
      );
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.researchDoc.update({ where: { ideaId: id }, data: update }),
    ...versionOps,
  ]);

  // Audit log (non-blocking)
  prisma.auditLog.create({
    data: { userId: user.id, action: 'RESEARCH_UPDATED', detail: `Research updated for ${id}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ completionScore, qualityScore, updatedAt: (updated as { updatedAt: Date }).updatedAt.toISOString() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeFullDoc(doc: any) {
  return {
    ...doc,
    status: doc.status as string,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
    lastEditedAt: doc.lastEditedAt ? doc.lastEditedAt.toISOString?.() ?? doc.lastEditedAt : null,
    idea: doc.idea ? {
      ...doc.idea,
      dir: doc.idea.dir as string,
      approvalStatus: doc.idea.approvalStatus as string,
      submittedAt: doc.idea.submittedAt?.toISOString?.() ?? doc.idea.submittedAt,
      createdAt: doc.idea.createdAt?.toISOString?.() ?? doc.idea.createdAt,
      updatedAt: doc.idea.updatedAt?.toISOString?.() ?? doc.idea.updatedAt,
    } : null,
    catalysts: (doc.catalysts ?? []).map((c: Record<string, unknown>) => ({
      ...c, createdAt: (c.createdAt as Date)?.toISOString?.() ?? c.createdAt,
      updatedAt: (c.updatedAt as Date)?.toISOString?.() ?? c.updatedAt,
    })),
    risks: (doc.risks ?? []).map((r: Record<string, unknown>) => ({
      ...r, createdAt: (r.createdAt as Date)?.toISOString?.() ?? r.createdAt,
      updatedAt: (r.updatedAt as Date)?.toISOString?.() ?? r.updatedAt,
    })),
    attachments: (doc.attachments ?? []).map((a: Record<string, unknown>) => ({
      ...a, createdAt: (a.createdAt as Date)?.toISOString?.() ?? a.createdAt,
    })),
    references: (doc.references ?? []).map((r: Record<string, unknown>) => ({
      ...r, createdAt: (r.createdAt as Date)?.toISOString?.() ?? r.createdAt,
      publishDate: r.publishDate ? (r.publishDate as Date)?.toISOString?.() ?? r.publishDate : null,
    })),
    comments: (doc.comments ?? []).map((c: Record<string, unknown> & { replies?: Record<string, unknown>[] }) => ({
      ...c,
      createdAt: (c.createdAt as Date)?.toISOString?.() ?? c.createdAt,
      updatedAt: (c.updatedAt as Date)?.toISOString?.() ?? c.updatedAt,
      replies: (c.replies ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        createdAt: (r.createdAt as Date)?.toISOString?.() ?? r.createdAt,
        updatedAt: (r.updatedAt as Date)?.toISOString?.() ?? r.updatedAt,
      })),
    })),
    versions: (doc.versions ?? []).map((v: Record<string, unknown>) => ({
      ...v, createdAt: (v.createdAt as Date)?.toISOString?.() ?? v.createdAt,
    })),
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

async function getDoc(ideaId: string) {
  return prisma.researchDoc.findUnique({ where: { ideaId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.researchRisk.findMany({ where: { docId: doc.id }, orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(items.map(r => ({
    ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { description, severity, probability, mitigation } = body;
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
  const count = await prisma.researchRisk.count({ where: { docId: doc.id } });
  const item = await prisma.researchRisk.create({
    data: {
      docId: doc.id,
      description: String(description),
      severity: String(severity ?? 'MEDIUM'),
      probability: probability !== undefined ? Number(probability) : null,
      mitigation: mitigation ? String(mitigation) : null,
      sortOrder: count,
    },
  });
  return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.authorId !== user.legacyId && !['CIO', 'PM'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const riskId = req.nextUrl.searchParams.get('riskId');
  if (!riskId) return NextResponse.json({ error: 'riskId required' }, { status: 400 });
  await prisma.researchRisk.delete({ where: { id: riskId, docId: doc.id } });
  return NextResponse.json({ ok: true });
}

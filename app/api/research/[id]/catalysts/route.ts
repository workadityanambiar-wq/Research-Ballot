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
  const items = await prisma.researchCatalyst.findMany({ where: { docId: doc.id }, orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(items.map(c => ({
    ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
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
  const { title, description, expectedImpact, probability, timeline, importance } = body;
  if (!title || !description) return NextResponse.json({ error: 'title and description required' }, { status: 400 });
  const count = await prisma.researchCatalyst.count({ where: { docId: doc.id } });
  const item = await prisma.researchCatalyst.create({
    data: {
      docId: doc.id,
      title: String(title),
      description: String(description),
      expectedImpact: expectedImpact ? String(expectedImpact) : null,
      probability: probability !== undefined ? Number(probability) : null,
      timeline: timeline ? String(timeline) : null,
      importance: String(importance ?? 'MEDIUM'),
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
  const catalystId = req.nextUrl.searchParams.get('catalystId');
  if (!catalystId) return NextResponse.json({ error: 'catalystId required' }, { status: 400 });
  await prisma.researchCatalyst.delete({ where: { id: catalystId, docId: doc.id } });
  return NextResponse.json({ ok: true });
}

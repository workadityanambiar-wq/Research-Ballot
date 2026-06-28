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
  const items = await prisma.researchReference.findMany({
    where: { docId: doc.id }, orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    publishDate: r.publishDate ? r.publishDate.toISOString() : null,
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, source, url, publishDate, notes } = body;
  if (!title || !source) return NextResponse.json({ error: 'title and source required' }, { status: 400 });

  const item = await prisma.researchReference.create({
    data: {
      docId: doc.id,
      title: String(title),
      source: String(source),
      url: url ? String(url) : null,
      publishDate: publishDate ? new Date(String(publishDate)) : null,
      notes: notes ? String(notes) : null,
      addedBy: user.legacyId,
    },
  });
  return NextResponse.json({
    ...item,
    createdAt: item.createdAt.toISOString(),
    publishDate: item.publishDate ? item.publishDate.toISOString() : null,
  }, { status: 201 });
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
  const refId = req.nextUrl.searchParams.get('refId');
  if (!refId) return NextResponse.json({ error: 'refId required' }, { status: 400 });
  await prisma.researchReference.delete({ where: { id: refId, docId: doc.id } });
  return NextResponse.json({ ok: true });
}

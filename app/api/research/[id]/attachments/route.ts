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
  const items = await prisma.researchAttachment.findMany({
    where: { docId: doc.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, description, fileType, fileUrl, fileSize } = body;
  if (!title || !fileUrl || !fileType) {
    return NextResponse.json({ error: 'title, fileUrl, and fileType required' }, { status: 400 });
  }

  const item = await prisma.researchAttachment.create({
    data: {
      docId: doc.id,
      title: String(title),
      description: description ? String(description) : null,
      fileType: String(fileType),
      fileUrl: String(fileUrl),
      fileSize: fileSize ? Number(fileSize) : null,
      uploadedBy: user.legacyId,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'ATTACHMENT_ADDED', detail: `Attachment "${String(title)}" added to ${id}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString() }, { status: 201 });
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
  const attachId = req.nextUrl.searchParams.get('attachId');
  if (!attachId) return NextResponse.json({ error: 'attachId required' }, { status: 400 });
  await prisma.researchAttachment.update({ where: { id: attachId, docId: doc.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

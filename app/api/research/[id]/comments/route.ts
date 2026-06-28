import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session-helpers';

async function getDoc(ideaId: string) {
  return prisma.researchDoc.findUnique({ where: { ideaId } });
}

function serializeComment(c: Record<string, unknown> & { replies?: Record<string, unknown>[] }) {
  return {
    ...c,
    createdAt: (c.createdAt as Date).toISOString(),
    updatedAt: (c.updatedAt as Date).toISOString(),
    replies: (c.replies ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      createdAt: (r.createdAt as Date).toISOString(),
      updatedAt: (r.updatedAt as Date).toISOString(),
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comments = await prisma.researchComment.findMany({
    where: { docId: doc.id, deletedAt: null, parentId: null },
    include: { replies: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  // Enrich with user display names
  const authorIds = [...new Set([
    ...comments.map(c => c.authorId),
    ...comments.flatMap(c => c.replies.map(r => r.authorId)),
  ])];
  const users = await prisma.user.findMany({
    where: { legacyId: { in: authorIds } },
    select: { legacyId: true, displayName: true },
  });
  const nameMap = Object.fromEntries(users.map(u => [u.legacyId, u.displayName]));

  return NextResponse.json(
    comments.map(c => ({
      ...serializeComment(c as unknown as Record<string, unknown> & { replies: Record<string, unknown>[] }),
      authorName: nameMap[c.authorId] ?? c.authorId,
      replies: c.replies.map(r => ({
        ...serializeComment(r as unknown as Record<string, unknown>),
        authorName: nameMap[r.authorId] ?? r.authorId,
      })),
    })),
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { content, parentId } = body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }

  const comment = await prisma.researchComment.create({
    data: {
      docId: doc.id,
      authorId: user.legacyId,
      content: content.trim(),
      parentId: parentId ? String(parentId) : null,
    },
  });

  prisma.auditLog.create({
    data: { userId: user.id, action: 'COMMENT_POSTED', detail: `Comment on research for ${id}`, risk: 'LOW' },
  }).catch(() => {});

  return NextResponse.json({
    ...comment,
    authorName: user.name,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: [],
  }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const commentId = req.nextUrl.searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const comment = await prisma.researchComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.docId !== doc.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (comment.authorId !== user.legacyId && user.role !== 'CIO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.researchComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

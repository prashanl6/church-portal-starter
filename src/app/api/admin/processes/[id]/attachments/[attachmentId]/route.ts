import { NextResponse } from 'next/server';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { getUserFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const processDocId = Number(params.id);
  const attachmentId = Number(params.attachmentId);
  if (!Number.isFinite(processDocId) || !Number.isFinite(attachmentId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const att = await prisma.processAttachment.findFirst({
      where: { id: attachmentId, processDocId },
    });
    if (!att) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    await prisma.processAttachment.delete({ where: { id: attachmentId } });
    const rel = att.storedPath.replace(/^\//, '');
    try {
      await unlink(join(process.cwd(), 'public', rel));
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE process attachment', e);
    return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteProcessAttachmentsByIds } from '@/lib/processAttachmentFs';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const u = await getUserFromCookie();
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

    const doc = await prisma.processDoc.findUnique({ where: { id: processDocId } });
    // Removing a live file from a published document needs approval (use Edit → Remove).
    if (doc?.status === 'published' && att.status === 'active') {
      return NextResponse.json(
        { error: 'This document is published. To remove a file, click Edit, tick Remove next to the file and submit for approval.' },
        { status: 400 }
      );
    }
    await deleteProcessAttachmentsByIds(processDocId, [attachmentId]);
    await audit(u.id, 'remove_process_attachment', 'process', processDocId, { fileName: att.fileName }, null);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE process attachment', e);
    return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 });
  }
}

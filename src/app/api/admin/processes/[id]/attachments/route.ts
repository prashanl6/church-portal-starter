import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveProcessAttachmentFile } from '@/lib/processAttachmentFs';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid process id' }, { status: 400 });
  }

  try {
    const doc = await prisma.processDoc.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const { storedPath, mimeType, byteSize, fileId } = await saveProcessAttachmentFile(id, file.name || 'document', file);

    // A file added to an already-published document is a change: it stays hidden ("pending")
    // until a different admin approves the update.
    const isPublished = doc.status === 'published';
    const attachment = await prisma.processAttachment.create({
      data: {
        processDocId: id,
        fileName: file.name || 'document',
        storedPath,
        mimeType,
        byteSize,
        fileId,
        status: isPublished ? 'pending' : 'active',
      },
    });

    if (isPublished) {
      const pendingUpdate = await prisma.approval.findFirst({
        where: { resourceType: 'process', resourceId: id, action: 'update', status: 'SUBMITTED' },
      });
      if (!pendingUpdate) await submitApproval('process', id, 'update', u.id, {});
    }
    await audit(u.id, 'upload_process_attachment', 'process', id, null, { fileName: attachment.fileName, pending: isPublished });

    return NextResponse.json({
      ok: true,
      attachment,
      message: isPublished ? 'File uploaded. It will appear once another administrator approves the change.' : 'File uploaded.',
    });
  } catch (e: any) {
    console.error('POST process attachment', e);
    return NextResponse.json({ error: e.message || 'Failed to upload file' }, { status: 400 });
  }
}

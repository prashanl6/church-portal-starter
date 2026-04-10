import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveProcessAttachmentFile } from '@/lib/processAttachmentFs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = getUserFromCookie();
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

    const { storedPath, mimeType, byteSize } = await saveProcessAttachmentFile(id, file.name || 'document', file);

    const attachment = await prisma.processAttachment.create({
      data: {
        processDocId: id,
        fileName: file.name || 'document',
        storedPath,
        mimeType,
        byteSize,
      },
    });

    return NextResponse.json({ ok: true, attachment });
  } catch (e: any) {
    console.error('POST process attachment', e);
    return NextResponse.json({ error: e.message || 'Failed to upload file' }, { status: 400 });
  }
}

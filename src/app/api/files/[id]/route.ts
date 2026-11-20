import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromCookie } from '@/lib/auth';

/**
 * Serves an uploaded file after checking who may see it:
 * - payment slips: logged-in admin/staff only
 * - process attachments: same rules as the document (public / stewards / unpublished = staff only)
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new NextResponse('Not found', { status: 404 });

  const user = getUserFromCookie();
  const isStaff = !!user && (user.role === 'admin' || user.role === 'staff');

  const meta = await prisma.storedFile.findUnique({
    where: { id },
    select: { id: true, kind: true, fileName: true, mimeType: true },
  });
  if (!meta) return new NextResponse('Not found', { status: 404 });

  let allowed = false;
  if (meta.kind === 'booking_slip') {
    allowed = isStaff;
  } else if (meta.kind === 'process_attachment') {
    const att = await prisma.processAttachment.findFirst({ where: { fileId: id }, include: { processDoc: true } });
    if (att) {
      const live = att.status === 'active' && att.processDoc.status === 'published';
      allowed = isStaff || (live && (att.processDoc.audience === 'public' || !!user));
    }
  }
  // Same answer as "missing" so file ids cannot be probed.
  if (!allowed) return new NextResponse('Not found', { status: 404 });

  const file = await prisma.storedFile.findUnique({ where: { id }, select: { data: true } });
  if (!file) return new NextResponse('Not found', { status: 404 });

  const inline = meta.mimeType === 'application/pdf' || meta.mimeType.startsWith('image/');
  const safeName = meta.fileName.replace(/[^\w.\- ]+/g, '_');
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': meta.mimeType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const dynamic = 'force-dynamic';

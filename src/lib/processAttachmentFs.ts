import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';

const MAX_BYTES = 25 * 1024 * 1024;

/** MIME types browsers send for Excel / Word uploads. */
export const PROCESS_DOC_ALLOWED_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function extensionAllowed(name: string): boolean {
  return /\.(xlsx|xls|docx|doc)$/i.test(name);
}

function mimeOrExtensionOk(file: File, originalName: string): boolean {
  if (file.type && PROCESS_DOC_ALLOWED_MIMES.has(file.type)) return true;
  return extensionAllowed(originalName);
}

function safeSegment(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return base || 'file';
}

export async function saveProcessAttachmentFile(
  processDocId: number,
  originalName: string,
  file: File
): Promise<{ storedPath: string; mimeType: string; byteSize: number }> {
  if (file.size > MAX_BYTES) {
    throw new Error('File too large (maximum 25MB)');
  }
  if (!mimeOrExtensionOk(file, originalName)) {
    throw new Error('Only Excel (.xls, .xlsx) and Word (.doc, .docx) files are allowed');
  }

  const mimeType =
    file.type && PROCESS_DOC_ALLOWED_MIMES.has(file.type)
      ? file.type
      : /\.xlsx?$/i.test(originalName)
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : /\.xls$/i.test(originalName)
          ? 'application/vnd.ms-excel'
          : /\.docx$/i.test(originalName)
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword';

  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'processes', String(processDocId));
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const stamp = Date.now();
  const safe = safeSegment(originalName);
  const diskName = `${stamp}-${safe}`;
  const absPath = join(uploadsDir, diskName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, bytes);

  const storedPath = `/uploads/processes/${processDocId}/${diskName}`;
  return { storedPath, mimeType, byteSize: bytes.length };
}

export async function unlinkProcessAttachmentFiles(processDocId: number): Promise<void> {
  const rows = await prisma.processAttachment.findMany({ where: { processDocId } });
  for (const r of rows) {
    const rel = r.storedPath.replace(/^\//, '');
    const abs = join(process.cwd(), 'public', rel);
    try {
      await unlink(abs);
    } catch {
      /* ignore missing file */
    }
  }
}

/** Delete specific attachments that belong to this process (DB row + file on disk). */
export async function deleteProcessAttachmentsByIds(processDocId: number, ids: number[]): Promise<void> {
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!unique.length) return;
  for (const attId of unique) {
    const att = await prisma.processAttachment.findFirst({
      where: { id: attId, processDocId },
    });
    if (!att) continue;
    await prisma.processAttachment.delete({ where: { id: att.id } });
    const rel = att.storedPath.replace(/^\//, '');
    try {
      await unlink(join(process.cwd(), 'public', rel));
    } catch {
      /* ignore missing file */
    }
  }
}

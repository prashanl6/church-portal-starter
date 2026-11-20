import { join } from 'path';
import { unlink } from 'fs/promises';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteStoredFiles, saveStoredFile, storedFileUrl } from '@/lib/storedFiles';

type Db = PrismaClient | Prisma.TransactionClient;

// Vercel rejects request bodies over 4.5 MB, so keep uploads under that.
const MAX_BYTES = 4 * 1024 * 1024;

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

function mimeFromName(originalName: string): string {
  if (/\.xlsx$/i.test(originalName)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (/\.xls$/i.test(originalName)) return 'application/vnd.ms-excel';
  if (/\.docx$/i.test(originalName)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/msword';
}

/** Validate and store an Excel/Word file in the database. Returns the attachment fields. */
export async function saveProcessAttachmentFile(
  _processDocId: number,
  originalName: string,
  file: File
): Promise<{ storedPath: string; mimeType: string; byteSize: number; fileId: number }> {
  if (file.size > MAX_BYTES) {
    throw new Error('This file is too large. The maximum size is 4 MB.');
  }
  // Require the extension to match even when the browser sends a valid MIME type.
  if (!extensionAllowed(originalName)) {
    throw new Error('Only Excel (.xls, .xlsx) and Word (.doc, .docx) files can be attached.');
  }
  const mimeType = mimeFromName(originalName);
  const { id, byteSize } = await saveStoredFile('process_attachment', file, originalName, mimeType);
  return { storedPath: storedFileUrl(id), mimeType, byteSize, fileId: id };
}

async function unlinkLegacy(storedPath: string) {
  if (!storedPath.startsWith('/uploads/')) return;
  try {
    await unlink(join(process.cwd(), 'public', storedPath.replace(/^\//, '')));
  } catch {
    /* ignore missing file */
  }
}

/** Remove every attachment's stored bytes for a process (rows cascade when the process is deleted). */
export async function unlinkProcessAttachmentFiles(processDocId: number, db: Db = prisma): Promise<void> {
  const rows = await db.processAttachment.findMany({ where: { processDocId } });
  await deleteStoredFiles(rows.map((r) => r.fileId), db);
  for (const r of rows) await unlinkLegacy(r.storedPath);
}

/** Delete specific attachments that belong to this process (row + stored bytes). */
export async function deleteProcessAttachmentsByIds(
  processDocId: number,
  ids: number[],
  db: Db = prisma
): Promise<void> {
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!unique.length) return;
  const rows = await db.processAttachment.findMany({ where: { processDocId, id: { in: unique } } });
  if (!rows.length) return;
  await db.processAttachment.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await deleteStoredFiles(rows.map((r) => r.fileId), db);
  for (const r of rows) await unlinkLegacy(r.storedPath);
}

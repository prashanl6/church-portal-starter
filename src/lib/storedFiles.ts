import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export type StoredFileKind = 'booking_slip' | 'process_attachment';

/** URL that serves a stored file (access is checked by the route). */
export function storedFileUrl(id: number): string {
  return `/api/files/${id}`;
}

/**
 * Save an uploaded file's bytes in PostgreSQL. Files on the web server's disk are lost on
 * serverless hosts (e.g. Vercel) and would be publicly reachable under /public.
 */
export async function saveStoredFile(
  kind: StoredFileKind,
  file: File,
  fileName: string,
  mimeType: string,
  db: Db = prisma
): Promise<{ id: number; byteSize: number }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const row = await db.storedFile.create({
    data: { kind, fileName: fileName.slice(0, 200), mimeType, byteSize: bytes.length, data: bytes },
    select: { id: true, byteSize: true },
  });
  return row;
}

export async function deleteStoredFiles(ids: Array<number | null | undefined>, db: Db = prisma): Promise<void> {
  const clean = ids.filter((n): n is number => typeof n === 'number' && n > 0);
  if (clean.length) await db.storedFile.deleteMany({ where: { id: { in: clean } } });
}

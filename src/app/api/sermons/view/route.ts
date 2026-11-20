import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isValidRaterClientId } from '@/lib/sermonRating';

export const dynamic = 'force-dynamic';

/**
 * Records that a device opened a sermon. Requirement: "rating = number of views",
 * so each device counts once per sermon (stored as one SermonRating row).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sermonId?: unknown; clientId?: unknown } | null;
  const sermonId = Number(body?.sermonId);
  const clientId = body?.clientId;
  if (!Number.isInteger(sermonId) || sermonId < 1 || !isValidRaterClientId(clientId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const sermon = await prisma.sermon.findUnique({ where: { id: sermonId }, select: { status: true } });
  if (!sermon || sermon.status !== 'published') {
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 });
  }
  await prisma.sermonRating.upsert({
    where: { sermonId_clientId: { sermonId, clientId } },
    create: { sermonId, clientId, stars: 1 },
    update: {},
  });
  const views = await prisma.sermonRating.count({ where: { sermonId } });
  return NextResponse.json({ ok: true, sermonId, views, rating: views });
}

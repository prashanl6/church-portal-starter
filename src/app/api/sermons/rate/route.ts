import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { computeSermonRatingStats, isValidRaterClientId, ratingAggregatesFromGroupBy } from '@/lib/sermonRating';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const sermonId = Number((body as { sermonId?: unknown }).sermonId);
    const stars = Number((body as { stars?: unknown }).stars);
    const clientId = (body as { clientId?: unknown }).clientId;

    if (!Number.isInteger(sermonId) || sermonId < 1) {
      return NextResponse.json({ error: 'Invalid sermonId' }, { status: 400 });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Stars must be an integer from 1 to 5' }, { status: 400 });
    }
    if (!isValidRaterClientId(clientId)) {
      return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 });
    }

    const sermon = await prisma.sermon.findUnique({ where: { id: sermonId } });
    if (!sermon || sermon.status !== 'published') {
      return NextResponse.json({ error: 'Sermon not found' }, { status: 404 });
    }

    await prisma.sermonRating.upsert({
      where: { sermonId_clientId: { sermonId, clientId } },
      create: { sermonId, clientId, stars },
      update: { stars }
    });

    const agg = await prisma.sermonRating.groupBy({
      by: ['sermonId'],
      where: { sermonId },
      _sum: { stars: true },
      _count: { _all: true }
    });

    const map = ratingAggregatesFromGroupBy(agg);
    const stats = map.get(sermonId);
    const { averageRating, ratingCount } = stats
      ? { averageRating: stats.averageRating, ratingCount: stats.ratingCount }
      : computeSermonRatingStats(0, 0);

    return NextResponse.json({
      ok: true,
      sermonId,
      yourStars: stars,
      averageRating,
      ratingCount
    });
  } catch (e) {
    console.error('POST /api/sermons/rate', e);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }
}

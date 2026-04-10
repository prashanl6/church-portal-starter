import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isValidRaterClientId, ratingAggregatesFromGroupBy } from '@/lib/sermonRating';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientIdRaw = searchParams.get('clientId');
    const clientId = clientIdRaw && isValidRaterClientId(clientIdRaw) ? clientIdRaw : null;

    const list = await prisma.sermon.findMany({
      where: {
        status: 'published'
      },
      orderBy: { date: 'desc' }
    });

    const ids = list.map((s) => s.id);
    const groups =
      ids.length === 0
        ? []
        : await prisma.sermonRating.groupBy({
            by: ['sermonId'],
            where: { sermonId: { in: ids } },
            _sum: { stars: true },
            _count: { _all: true }
          });

    const aggMap = ratingAggregatesFromGroupBy(groups);

    const mineRows =
      clientId && ids.length > 0
        ? await prisma.sermonRating.findMany({
            where: { clientId, sermonId: { in: ids } },
            select: { sermonId: true, stars: true }
          })
        : [];
    const mineMap = new Map(mineRows.map((r) => [r.sermonId, r.stars]));

    const enriched = list.map((s) => {
      const a = aggMap.get(s.id);
      return {
        ...s,
        averageRating: a?.averageRating ?? null,
        ratingCount: a?.ratingCount ?? 0,
        yourStars: mineMap.get(s.id) ?? null
      };
    });

    return NextResponse.json({ list: enriched });
  } catch (error) {
    console.error('Error fetching sermons:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch sermons' }, { status: 500 });
  }
}

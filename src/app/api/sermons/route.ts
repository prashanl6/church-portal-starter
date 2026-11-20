import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Published sermons, newest first. rating = views (number of devices that opened it). */
export async function GET() {
  try {
    const list = await prisma.sermon.findMany({
      where: { status: 'published' },
      orderBy: { date: 'desc' },
      include: { _count: { select: { ratings: true } } },
    });
    return NextResponse.json({
      list: list.map(({ _count, ...s }) => ({ ...s, views: _count.ratings, rating: _count.ratings })),
    });
  } catch (error) {
    console.error('Error fetching sermons:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch sermons' }, { status: 500 });
  }
}

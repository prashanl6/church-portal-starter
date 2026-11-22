import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hydrateNoticeBodiesWithPeopleSnapshot } from '@/lib/noticePeopleSnapshot';

/**
 * The notices people should see now: the sheet for this Sunday (or the coming one) and anything
 * older. Notices written for later weeks stay hidden from visitors until their week arrives;
 * administrators always see every notice under Admin → Notices.
 * Uses Sri Lanka time (UTC+5:30), since notices are dated by Sunday.
 */
function endOfComingWeek() {
  const local = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const daysToSunday = (7 - local.getUTCDay()) % 7; // 0 on a Sunday
  return new Date(day + daysToSunday * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1);
}

export async function GET() {
  try {
    // Get notices from the last 10 weeks
    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70); // 10 weeks = 70 days

    const list = await prisma.notice.findMany({
      where: {
        status: 'published',
        weekOf: { gte: tenWeeksAgo, lte: endOfComingWeek() }
      },
      orderBy: { weekOf: 'desc' }
    });

    const hydrated = await hydrateNoticeBodiesWithPeopleSnapshot(list);

    return NextResponse.json({ list: hydrated });
  } catch (error) {
    console.error('Error fetching notices:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch notices' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

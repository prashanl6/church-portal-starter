import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get notices from the last 10 weeks
    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70); // 10 weeks = 70 days
    
    const list = await prisma.notice.findMany({
      where: {
        status: 'published',
        weekOf: { gte: tenWeeksAgo }
      },
      orderBy: { weekOf: 'desc' }
    });
    
    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching notices:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch notices' }, { status: 500 });
  }
}

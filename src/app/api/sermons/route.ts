import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const list = await prisma.sermon.findMany({
      where: {
        status: 'published'
      },
      orderBy: { date: 'desc' }
    });
    
    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching sermons:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch sermons' }, { status: 500 });
  }
}


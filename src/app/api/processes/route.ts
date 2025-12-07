import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const list = await prisma.processDoc.findMany({
      where: {
        status: 'published'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch processes' }, { status: 500 });
  }
}


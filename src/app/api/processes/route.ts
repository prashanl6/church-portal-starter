import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = getUserFromCookie();
    const list = await prisma.processDoc.findMany({
      where: {
        status: 'published',
        ...(user ? {} : { audience: 'public' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch processes' }, { status: 500 });
  }
}


import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { sanitizeRichHtml } from '@/lib/sanitizeHtml';

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
        attachments: { where: { status: 'active' }, orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ list: list.map((p) => ({ ...p, contentHtml: sanitizeRichHtml(p.contentHtml) })) });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch processes' }, { status: 500 });
  }
}


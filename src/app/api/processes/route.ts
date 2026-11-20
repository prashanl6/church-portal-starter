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
      orderBy: { createdAt: 'asc' },
      include: {
        attachments: { where: { status: 'active' }, orderBy: { createdAt: 'asc' } },
      },
    });

    // Each process has an owner (requirement); show their name, not their id.
    const owners = await prisma.user.findMany({
      where: { id: { in: [...new Set(list.map((p) => p.ownerUserId))] } },
      select: { id: true, name: true },
    });
    const ownerName = new Map(owners.map((o) => [o.id, o.name]));

    return NextResponse.json({
      list: list.map((p) => ({
        ...p,
        ownerName: ownerName.get(p.ownerUserId) || null,
        contentHtml: sanitizeRichHtml(p.contentHtml),
      })),
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json({ list: [], error: 'Failed to fetch processes' }, { status: 500 });
  }
}


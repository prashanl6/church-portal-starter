import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { storedFileUrl } from '@/lib/storedFiles';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  
  try {
    const list = await prisma.booking.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      take: 100 
    });
    return NextResponse.json({
      list: list.map((b) => ({ ...b, slipUrl: b.slipFileId ? storedFileUrl(b.slipFileId) : b.slipUrl })),
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings', list: [] }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

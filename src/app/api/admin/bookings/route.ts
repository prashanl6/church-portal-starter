import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

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
    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in GET /api/admin/bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings', list: [] }, { status: 500 });
  }
}


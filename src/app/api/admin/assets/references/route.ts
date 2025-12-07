import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    // Get all unique references from assets
    const assets = await prisma.asset.findMany({
      select: { reference: true },
      distinct: ['reference'],
      orderBy: { reference: 'asc' }
    });
    
    const references = assets.map(a => a.reference);
    return NextResponse.json({ references });
  } catch (error: any) {
    console.error('Error in GET /api/admin/assets/references:', error);
    return NextResponse.json({ references: [] }, { status: 500 });
  }
}


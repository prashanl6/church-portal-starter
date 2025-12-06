import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const items = await prisma.medicalItem.findMany({ orderBy: { name: 'asc' } });
    const loans = await prisma.medicalLoan.findMany({
      include: { item: true },
      orderBy: { requestDate: 'desc' },
      take: 100
    });
    return NextResponse.json({ items, loans });
  } catch (error: any) {
    console.error('Error in GET /api/admin/medical:', error);
    return NextResponse.json({ error: 'Failed to fetch medical data', items: [], loans: [] }, { status: 500 });
  }
}


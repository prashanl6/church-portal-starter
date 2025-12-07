import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const list = await prisma.auditLog.findMany({ 
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in GET /api/admin/audit:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs', list: [] }, { status: 500 });
  }
}


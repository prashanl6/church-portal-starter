import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(params.id);
    
    const existing = await prisma.processDoc.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    const updated = await prisma.processDoc.update({
      where: { id },
      data: {
        ...body,
        version: existing.version + 1
      }
    });

    return NextResponse.json({ ok: true, process: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/processes/[id]:', error);
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}


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
    
    const updated = await prisma.peopleEvent.update({
      where: { id },
      data: body
    });

    return NextResponse.json({ ok: true, event: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/people/[id]:', error);
    return NextResponse.json({ error: 'Failed to update people event' }, { status: 500 });
  }
}


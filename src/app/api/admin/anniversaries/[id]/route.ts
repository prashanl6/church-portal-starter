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

    const data: Record<string, unknown> = {};
    if (typeof body.status === 'string') data.status = body.status;
    if (body.anniversaryDate != null) data.anniversaryDate = new Date(body.anniversaryDate);
    if (body.notes !== undefined) data.notes = body.notes === '' || body.notes == null ? null : String(body.notes);

    if (body.individualAId != null || body.individualBId != null) {
      const cur = await prisma.weddingAnniversary.findUnique({ where: { id } });
      if (!cur) {
        return NextResponse.json({ error: 'Anniversary not found' }, { status: 404 });
      }
      const newA = body.individualAId != null ? Number(body.individualAId) : cur.individualAId;
      const newB = body.individualBId != null ? Number(body.individualBId) : cur.individualBId;
      if (newA === newB) {
        return NextResponse.json({ error: 'Choose two different individuals' }, { status: 400 });
      }
      data.individualAId = newA;
      data.individualBId = newB;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.weddingAnniversary.update({
      where: { id },
      data
    });

    return NextResponse.json({ ok: true, anniversary: updated });
  } catch (error: unknown) {
    console.error('Error in PATCH /api/admin/anniversaries/[id]:', error);
    return NextResponse.json({ error: 'Failed to update anniversary' }, { status: 500 });
  }
}

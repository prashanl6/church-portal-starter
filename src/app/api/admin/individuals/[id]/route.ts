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
    if (typeof body.displayName === 'string') data.displayName = body.displayName;
    if (body.birthDate !== undefined) {
      data.birthDate =
        body.birthDate === '' || body.birthDate == null ? null : new Date(body.birthDate);
    }
    if (body.email !== undefined) data.email = body.email === '' || body.email == null ? null : String(body.email);
    if (body.phone !== undefined) data.phone = body.phone === '' || body.phone == null ? null : String(body.phone);
    if (body.notes !== undefined) data.notes = body.notes === '' || body.notes == null ? null : String(body.notes);
    if (body.dateOfDeath !== undefined) {
      if (body.dateOfDeath === '' || body.dateOfDeath == null) {
        data.dateOfDeath = null;
      } else {
        data.dateOfDeath = new Date(body.dateOfDeath);
        data.status = 'inactive';
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.churchIndividual.update({
      where: { id },
      data
    });

    return NextResponse.json({ ok: true, individual: updated });
  } catch (error: unknown) {
    console.error('Error in PATCH /api/admin/individuals/[id]:', error);
    return NextResponse.json({ error: 'Failed to update individual' }, { status: 500 });
  }
}

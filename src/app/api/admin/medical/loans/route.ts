import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardStaffOrAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Staff or admin records a request to lend an item. An admin must approve before it is handed over. */
export async function POST(req: Request) {
  const g = await guardStaffOrAdmin();
  if ('response' in g) return g.response;
  const body = await req.json().catch(() => ({}));
  const itemId = Number(body?.itemId);
  const givenTo = String(body?.givenTo ?? '').trim();
  if (!itemId || !givenTo) {
    return NextResponse.json({ error: 'Please choose the item and enter who it is for.' }, { status: 400 });
  }
  try {
    const created = await prisma.$transaction(async (tx) => {
      // Atomic: only reserve if one is still available.
      const res = await tx.medicalItem.updateMany({
        where: { id: itemId, quantityAvailable: { gte: 1 } },
        data: { quantityAvailable: { decrement: 1 } },
      });
      if (res.count === 0) throw new Error('none_available');
      return tx.medicalLoan.create({
        data: { itemId, givenTo, givenByUserId: g.user.id, dueDate: body?.dueDate ? new Date(body.dueDate) : null },
      });
    });
    await audit(g.user.id, 'request_medical_loan', 'medical_loan', created.id, null, created);
    return NextResponse.json({ ok: true, id: created.id, message: 'Request saved. An administrator must approve it before the item is handed over.' });
  } catch (e: any) {
    if (e?.message === 'none_available') {
      return NextResponse.json({ error: 'None of this item are available right now.' }, { status: 400 });
    }
    console.error('POST medical loan', e);
    return NextResponse.json({ error: 'Could not save the request.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

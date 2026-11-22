import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardStaffOrAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await guardStaffOrAdmin();
  if ('response' in g) return g.response;
  const body = await req.json().catch(() => ({}));
  const loanId = Number(params.id);
  const loan = await prisma.medicalLoan.findUnique({ where: { id: loanId } });
  if (!loan) return NextResponse.json({ error: 'This loan was not found.' }, { status: 404 });
  const condition = body?.condition ? String(body.condition).slice(0, 500) : null;
  const done = await prisma.$transaction(async (tx) => {
    const res = await tx.medicalLoan.updateMany({
      where: { id: loanId, returned: false },
      data: { returned: true, returnedAt: new Date(), conditionOnReturn: condition },
    });
    if (res.count === 0) return false;
    await tx.medicalItem.update({ where: { id: loan.itemId }, data: { quantityAvailable: { increment: 1 } } });
    return true;
  });
  if (!done) return NextResponse.json({ error: 'This item has already been returned.' }, { status: 409 });
  await audit(g.user.id, 'return_medical_loan', 'medical_loan', loanId, null, { returned: true, condition });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

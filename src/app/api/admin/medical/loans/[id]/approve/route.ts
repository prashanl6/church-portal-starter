import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';

/** Only an admin, and not the person who asked for the loan, may approve it. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const loanId = Number(params.id);
  const loan = await prisma.medicalLoan.findUnique({ where: { id: loanId } });
  if (!loan) return NextResponse.json({ error: 'This loan was not found.' }, { status: 404 });
  if (loan.givenByUserId === g.user.id) {
    return NextResponse.json({ error: 'You requested this loan, so a different administrator must approve it.' }, { status: 403 });
  }
  const res = await prisma.medicalLoan.updateMany({
    where: { id: loanId, approvedByAdminId: null },
    data: { approvedByAdminId: g.user.id, approvedAt: new Date() },
  });
  if (res.count === 0) return NextResponse.json({ error: 'This loan has already been approved.' }, { status: 409 });
  await audit(g.user.id, 'approve_medical_loan', 'medical_loan', loanId, { approved: false }, { approved: true }, loan.givenByUserId, g.user.id);
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

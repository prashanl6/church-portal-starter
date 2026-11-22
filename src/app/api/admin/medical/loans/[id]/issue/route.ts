import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardStaffOrAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const g = await guardStaffOrAdmin();
  if ('response' in g) return g.response;
  const loanId = Number(params.id);
  const loan = await prisma.medicalLoan.findUnique({ where: { id: loanId } });
  if (!loan) return NextResponse.json({ error: 'This loan was not found.' }, { status: 404 });
  if (!loan.approvedByAdminId) return NextResponse.json({ error: 'An administrator must approve this loan first.' }, { status: 400 });
  const res = await prisma.medicalLoan.updateMany({ where: { id: loanId, issuedAt: null }, data: { issuedAt: new Date() } });
  if (res.count === 0) return NextResponse.json({ error: 'This item has already been handed over.' }, { status: 409 });
  await audit(g.user.id, 'issue_medical_loan', 'medical_loan', loanId, null, { issued: true });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';

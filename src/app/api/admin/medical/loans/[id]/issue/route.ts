import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const loanId = Number(params.id);
    const loan = await prisma.medicalLoan.findUnique({ where: { id: loanId } });
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (!loan.approvedByAdminId) {
      return NextResponse.json({ error: 'Loan must be approved first' }, { status: 400 });
    }
    if (loan.issuedAt) {
      return NextResponse.json({ error: 'Loan already issued' }, { status: 400 });
    }

    await prisma.medicalLoan.update({
      where: { id: loanId },
      data: { issuedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in POST /api/admin/medical/loans/[id]/issue:', error);
    return NextResponse.json({ error: 'Failed to issue loan' }, { status: 500 });
  }
}


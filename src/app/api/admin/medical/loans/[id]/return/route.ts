import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const loanId = Number(params.id);
    const loan = await prisma.medicalLoan.findUnique({ 
      where: { id: loanId },
      include: { item: true }
    });
    
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (loan.returned) {
      return NextResponse.json({ error: 'Loan already returned' }, { status: 400 });
    }

    await prisma.medicalLoan.update({
      where: { id: loanId },
      data: {
        returned: true,
        returnedAt: new Date(),
        conditionOnReturn: body.condition || null
      }
    });

    // Restore available quantity
    await prisma.medicalItem.update({
      where: { id: loan.itemId },
      data: { quantityAvailable: loan.item.quantityAvailable + 1 }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in POST /api/admin/medical/loans/[id]/return:', error);
    return NextResponse.json({ error: 'Failed to return loan' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { parseChurchBankAccountPayload } from '@/lib/churchBankAccountValidation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  try {
    const live = await prisma.churchBankAccount.findUnique({ where: { id: 1 } });
    const pendingProposal = await prisma.churchBankAccountProposal.findFirst({
      where: { status: 'PENDING' },
      orderBy: { id: 'desc' }
    });
    return NextResponse.json({
      live: live
        ? {
            accountNumber: live.accountNumber,
            accountName: live.accountName,
            bankName: live.bankName,
            branch: live.branch,
            updatedAt: live.updatedAt
          }
        : null,
      pendingProposal: pendingProposal
        ? {
            id: pendingProposal.id,
            accountNumber: pendingProposal.accountNumber,
            accountName: pendingProposal.accountName,
            bankName: pendingProposal.bankName,
            branch: pendingProposal.branch,
            createdAt: pendingProposal.createdAt
          }
        : null
    });
  } catch (e) {
    console.error('GET /api/admin/church-bank-account', e);
    return NextResponse.json({ error: 'Failed to load bank account settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = parseChurchBankAccountPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingPending = await prisma.churchBankAccountProposal.findFirst({
      where: { status: 'PENDING' }
    });
    if (existingPending) {
      const openAp = await prisma.approval.findFirst({
        where: {
          resourceType: 'church_bank_account',
          resourceId: existingPending.id,
          status: 'SUBMITTED'
        }
      });
      if (openAp) {
        return NextResponse.json(
          {
            error:
              'A bank account change is already waiting for approval. Complete or reject it in the Approvals queue first.'
          },
          { status: 409 }
        );
      }
    }

    const proposal = await prisma.churchBankAccountProposal.create({
      data: {
        accountNumber: parsed.data.accountNumber,
        accountName: parsed.data.accountName,
        bankName: parsed.data.bankName,
        branch: parsed.data.branch,
        status: 'PENDING'
      }
    });

    await submitApproval('church_bank_account', proposal.id, 'update', u.id);

    return NextResponse.json({
      ok: true,
      proposalId: proposal.id,
      message: 'Submitted for approval. Another admin or staff member can approve it in the Approvals queue.'
    });
  } catch (e) {
    console.error('POST /api/admin/church-bank-account', e);
    return NextResponse.json({ error: 'Failed to submit bank account change' }, { status: 500 });
  }
}

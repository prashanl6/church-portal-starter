import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardAdmin } from '@/lib/auth';
import { submitApproval, hasPendingApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Ask to switch off an account (it can no longer log in). Needs a second administrator. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const id = Number(params.id);
  const user = Number.isInteger(id) ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user || user.email === 'system@church.local') {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  if (user.status !== 'active') return NextResponse.json({ error: 'This account is already switched off.' }, { status: 400 });
  if (user.id === g.user.id) return NextResponse.json({ error: 'You cannot switch off your own account.' }, { status: 400 });
  if (await hasPendingApproval('user', id)) {
    return NextResponse.json({ error: 'A request for this account is already waiting for approval.' }, { status: 409 });
  }
  const ap = await submitApproval('user', id, 'disable', g.user.id);
  await audit(g.user.id, 'request_disable_user', 'user', id, { email: user.email, role: user.role }, { approvalId: ap.id });
  return NextResponse.json({ ok: true, message: `Switching off ${user.name}'s account has been sent for approval.` });
}

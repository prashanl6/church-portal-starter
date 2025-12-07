import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { approve } from '@/lib/approval';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const id = Number(params.id);
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'APPROVED_PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Booking is not in a state to confirm payment' }, { status: 400 });
    }

    if (!booking.slipUrl) {
      return NextResponse.json({ error: 'No payment receipt uploaded' }, { status: 400 });
    }

    // Find the payment confirmation approval
    const approval = await prisma.approval.findFirst({
      where: {
        resourceType: 'booking',
        resourceId: id,
        action: 'confirm_payment',
        status: 'SUBMITTED'
      }
    });

    if (!approval) {
      return NextResponse.json({ error: 'Payment approval not found. Please use the Approvals Queue.' }, { status: 400 });
    }

    // Approve the payment confirmation (this will update booking status and send email)
    await approve('booking', id, u.id, 'Payment receipt confirmed');

    return NextResponse.json({ ok: true, message: 'Payment confirmed successfully' });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to confirm payment' }, { status: 500 });
  }
}


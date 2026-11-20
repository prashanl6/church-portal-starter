import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { bookingRef: string } }) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingRef: params.bookingRef },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Church bank details are shown to the person who booked once it is approved, so they can
    // pay even if the approval email does not arrive. The reference link acts as the key.
    const bank =
      booking.status === 'APPROVED_PENDING_PAYMENT'
        ? await prisma.churchBankAccount.findUnique({ where: { id: 1 } }).catch(() => null)
        : null;

    return NextResponse.json({
      // Only what the person who booked needs to see. No internal ids or file links.
      booking: {
        bookingRef: booking.bookingRef,
        hall: booking.hall,
        date: booking.date.toISOString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
        purpose: booking.purpose,
        requesterName: booking.requesterName,
        email: booking.email,
        phone: booking.phone,
        status: booking.status,
        amount: booking.amount,
        paymentRef: booking.paymentRef,
        slipReceived: !!(booking.slipFileId || booking.slipUrl),
        bankAccount: bank
          ? { accountName: bank.accountName, accountNumber: bank.accountNumber, bankName: bank.bankName, branch: bank.branch }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

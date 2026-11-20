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
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

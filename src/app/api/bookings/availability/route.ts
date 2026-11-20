import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { HALL_HOLDING_STATUSES } from '@/lib/bookingClash';

export async function GET() {
  const today = new Date(new Date().toISOString().slice(0, 10));
  // Show approved (waiting for payment) and paid bookings from today onwards: both hold the hall.
  const booked = await prisma.booking.findMany({
    where: {
      status: { in: HALL_HOLDING_STATUSES },
      date: { gte: today },
    },
    select: { 
      date: true, 
      startTime: true, 
      endTime: true,
      hall: true
    } 
  });
  return NextResponse.json({ booked });
}

export const dynamic = 'force-dynamic';

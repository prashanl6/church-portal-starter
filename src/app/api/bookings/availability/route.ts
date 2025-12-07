import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  // Only show future bookings that are fully paid and approved
  const booked = await prisma.booking.findMany({ 
    where: { 
      status: 'BOOKED_PAID',
      date: { gte: now } // Only future dates
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

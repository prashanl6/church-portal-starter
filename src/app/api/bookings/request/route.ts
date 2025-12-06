import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { submitApproval, getOrCreateSystemUser } from '@/lib/approval';

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export async function POST(req: Request) {
  const { fullName, email, phone, purpose, date, startTime, endTime, hall } = await req.json();
  if (!purpose || !date || !startTime || !endTime) return new NextResponse('Missing fields', { status: 400 });
  const day = new Date(date);
  const sameDay = await prisma.booking.findMany({ where: { hall, date: day, status: { in: ['REQUESTED','APPROVED_PENDING_PAYMENT','BOOKED_PAID'] } } });
  for (const b of sameDay) {
    if (overlaps(startTime, endTime, b.startTime, b.endTime)) return new NextResponse('Time slot unavailable', { status: 409 });
  }
  const bookingRef = 'B' + Math.random().toString(36).slice(2,8).toUpperCase();
  const created = await prisma.booking.create({ data: { bookingRef, hall, date: day, startTime, endTime, purpose, requesterName: fullName, email, phone, status: 'REQUESTED' } });
  
  // Create approval record for the booking
  try {
    const systemUser = await getOrCreateSystemUser();
    await submitApproval('booking', created.id, 'approve', systemUser.id);
  } catch (approvalError: any) {
    console.error('Error creating approval for booking:', approvalError);
    // Don't fail the booking creation if approval creation fails
  }
  
  return NextResponse.json({ ok: true, bookingRef: created.bookingRef });
}

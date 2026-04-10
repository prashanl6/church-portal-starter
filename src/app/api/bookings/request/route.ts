import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { submitApproval, getOrCreateSystemUser } from '@/lib/approval';
import { sendBookingSubmissionEmail } from '@/lib/email';
import { computeHallBookingCharge } from '@/lib/hallBookingPricing';
import { getHallBookingSettings } from '@/lib/hallBookingSettingsDb';

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export async function POST(req: Request) {
  const { fullName, email, phone, purpose, date, startTime, endTime, hall } = await req.json();
  if (!purpose || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { ratePer30Minutes } = await getHallBookingSettings();
  const charge = computeHallBookingCharge(startTime, endTime, ratePer30Minutes);
  if (!charge.ok) {
    return NextResponse.json({ error: charge.error }, { status: 400 });
  }
  const day = new Date(date);
  // Only check against fully paid and approved bookings (BOOKED_PAID) for availability
  const sameDay = await prisma.booking.findMany({ 
    where: { 
      hall, 
      date: day, 
      status: 'BOOKED_PAID' // Only check against confirmed, paid bookings
    } 
  });
  for (const b of sameDay) {
    if (overlaps(startTime, endTime, b.startTime, b.endTime)) {
      return NextResponse.json({ error: 'Time slot unavailable' }, { status: 409 });
    }
  }
  const bookingRef = 'B' + Math.random().toString(36).slice(2,8).toUpperCase();
  const created = await prisma.booking.create({
    data: {
      bookingRef,
      hall,
      date: day,
      startTime,
      endTime,
      purpose,
      requesterName: fullName,
      email,
      phone,
      status: 'REQUESTED',
      amount: charge.total
    }
  });
  
  // Create approval record for the booking
  try {
    const systemUser = await getOrCreateSystemUser();
    await submitApproval('booking', created.id, 'approve', systemUser.id);
  } catch (approvalError: any) {
    console.error('Error creating approval for booking:', approvalError);
    // Don't fail the booking creation if approval creation fails
  }
  
  // Send confirmation email to requester
  try {
    await sendBookingSubmissionEmail({
      bookingRef: created.bookingRef,
      requesterName: fullName,
      email,
      phone,
      hall,
      date: day.toISOString(),
      startTime,
      endTime,
      purpose,
      amount: charge.total > 0 ? charge.total : undefined
    });
  } catch (emailError: any) {
    console.error('Error sending booking submission email:', emailError);
    // Don't fail the booking creation if email fails
  }
  
  return NextResponse.json({
    ok: true,
    bookingRef: created.bookingRef,
    amount: charge.total,
    slots: charge.slots,
    ratePer30Minutes
  });
}

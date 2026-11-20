import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateSystemUser } from '@/lib/approval';
import { sendBookingSubmissionEmail } from '@/lib/email';
import { computeHallBookingCharge } from '@/lib/hallBookingPricing';
import { getHallBookingSettings } from '@/lib/hallBookingSettingsDb';
import { findBookingClash } from '@/lib/bookingClash';
import { firstIssue } from '@/lib/validate';

const HALLS = ['Main Hall', 'Chapel'] as const;

const requestSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(150),
  email: z.string().trim().email('Please enter a valid email address, so we can send you the confirmation.').max(200),
  phone: z.string().trim().min(7, 'Please enter a phone number we can call.').max(30),
  purpose: z.string().trim().min(3, 'Please tell us what the booking is for.').max(1000),
  date: z.string().refine((v) => /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(new Date(v).getTime()), 'Please choose a date.'),
  startTime: z.string(),
  endTime: z.string(),
  hall: z.enum(HALLS, { errorMap: () => ({ message: 'Please choose the Main Hall or the Chapel.' }) }),
});

/** Readable, hard-to-guess reference such as B7K3QX9D. */
function newBookingRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreading
  const bytes = crypto.randomBytes(8);
  return 'B' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { fullName, email, phone, purpose, date, startTime, endTime, hall } = parsed.data;

  const { ratePer30Minutes } = await getHallBookingSettings();
  const charge = computeHallBookingCharge(startTime, endTime, ratePer30Minutes);
  if (!charge.ok) {
    return NextResponse.json({ error: charge.error }, { status: 400 });
  }
  const day = new Date(date.slice(0, 10)); // UTC midnight of the chosen day
  const today = new Date(new Date().toISOString().slice(0, 10));
  if (day < today) {
    return NextResponse.json({ error: 'Please choose today or a future date.' }, { status: 400 });
  }

  // Clashes with bookings that are approved (waiting for payment) or paid.
  const clash = await findBookingClash(prisma, { hall, date: day, startTime, endTime });
  if (clash) {
    return NextResponse.json(
      { error: `Sorry, the ${hall} is already booked from ${clash.startTime} to ${clash.endTime} that day. Please choose another time.` },
      { status: 409 }
    );
  }

  let bookingRef = newBookingRef();
  while (await prisma.booking.findUnique({ where: { bookingRef } })) bookingRef = newBookingRef();

  const systemUser = await getOrCreateSystemUser();
  const created = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
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
        amount: charge.total,
      },
    });
    await tx.approval.create({
      data: { resourceType: 'booking', resourceId: b.id, action: 'approve', submitterId: systemUser.id, status: 'SUBMITTED' },
    });
    return b;
  });

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
      amount: charge.total > 0 ? charge.total : undefined,
    });
  } catch (emailError: any) {
    console.error('Error sending booking submission email:', emailError);
  }

  return NextResponse.json({
    ok: true,
    bookingRef: created.bookingRef,
    amount: charge.total,
    slots: charge.slots,
    ratePer30Minutes,
  });
}

export const dynamic = 'force-dynamic';

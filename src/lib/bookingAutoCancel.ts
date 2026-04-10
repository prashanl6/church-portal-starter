import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { hallBookingTimeToMinutes } from '@/lib/hallBookingPricing';
import { prisma } from '@/lib/prisma';
import { sendBookingAutoCancelledEmail } from '@/lib/email';

dayjs.extend(utc);
dayjs.extend(timezone);

/** IANA timezone for interpreting booking date + start time (default: Sri Lanka). */
export const BOOKING_TIMEZONE = process.env.BOOKING_TIMEZONE || 'Asia/Colombo';

function formatStartTimeForParse(startTime: string): string | null {
  const mins = hallBookingTimeToMinutes(startTime);
  if (mins === null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Start instant of the booking in BOOKING_TIMEZONE. */
export function getBookingStartInTz(booking: { date: Date; startTime: string }): dayjs.Dayjs | null {
  const hhmm = formatStartTimeForParse(booking.startTime);
  if (hhmm === null) return null;
  const ymd = dayjs.utc(booking.date).format('YYYY-MM-DD');
  const inst = dayjs.tz(`${ymd} ${hhmm}`, 'YYYY-MM-DD HH:mm', BOOKING_TIMEZONE);
  return inst.isValid() ? inst : null;
}

/**
 * True when current time is at or after (booking start − 1 hour).
 * Payment must be fully confirmed (BOOKED_PAID) before this moment; otherwise the booking is auto-cancelled.
 */
export function bookingHasReachedPaymentDeadline(booking: { date: Date; startTime: string }): boolean {
  const start = getBookingStartInTz(booking);
  if (!start) return false;
  const deadline = start.subtract(1, 'hour');
  const now = dayjs().tz(BOOKING_TIMEZONE);
  return !now.isBefore(deadline);
}

const AUTO_CANCEL_COMMENT =
  'Auto-cancelled: payment was not confirmed at least 1 hour before the booking start.';

/**
 * Cancels APPROVED_PENDING_PAYMENT bookings past the payment deadline, rejects open approvals, sends email.
 * Safe to run repeatedly (idempotent per booking).
 */
export async function processBookingAutoCancellations(): Promise<{ cancelled: number }> {
  const pending = await prisma.booking.findMany({
    where: { status: 'APPROVED_PENDING_PAYMENT' },
  });

  let cancelled = 0;

  for (const b of pending) {
    if (!bookingHasReachedPaymentDeadline(b)) continue;

    const didCancel = await prisma.$transaction(async (tx) => {
      const upd = await tx.booking.updateMany({
        where: { id: b.id, status: 'APPROVED_PENDING_PAYMENT' },
        data: { status: 'AUTO_CANCELLED' },
      });
      if (upd.count === 0) return false;

      await tx.approval.updateMany({
        where: {
          resourceType: 'booking',
          resourceId: b.id,
          status: 'SUBMITTED',
        },
        data: {
          status: 'REJECTED',
          comment1: AUTO_CANCEL_COMMENT,
        },
      });
      return true;
    });

    if (!didCancel) continue;

    try {
      await sendBookingAutoCancelledEmail({
        bookingRef: b.bookingRef,
        requesterName: b.requesterName,
        email: b.email,
        phone: b.phone,
        hall: b.hall,
        date: b.date.toISOString(),
        startTime: b.startTime,
        endTime: b.endTime,
        purpose: b.purpose,
        amount: b.amount ?? undefined,
      });
    } catch (e) {
      console.error('booking auto-cancel email failed', b.bookingRef, e);
    }
    cancelled++;
  }

  return { cancelled };
}

import type { Prisma, PrismaClient } from '@prisma/client';
import { hallBookingTimeToMinutes } from './hallBookingPricing';

type Db = PrismaClient | Prisma.TransactionClient;

/** Statuses that hold the hall: approved and waiting for payment, or paid. */
export const HALL_HOLDING_STATUSES = ['APPROVED_PENDING_PAYMENT', 'BOOKED_PAID'];

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const as = hallBookingTimeToMinutes(aStart);
  const ae = hallBookingTimeToMinutes(aEnd);
  const bs = hallBookingTimeToMinutes(bStart);
  const be = hallBookingTimeToMinutes(bEnd);
  if (as === null || ae === null || bs === null || be === null) return true; // be safe
  return as < be && bs < ae;
}

/** Returns an approved/paid booking that overlaps the given slot, if any. */
export async function findBookingClash(
  db: Db,
  slot: { hall: string; date: Date; startTime: string; endTime: string; excludeId?: number }
) {
  const sameDay = await db.booking.findMany({
    where: {
      hall: slot.hall,
      date: slot.date,
      status: { in: HALL_HOLDING_STATUSES },
      ...(slot.excludeId ? { id: { not: slot.excludeId } } : {}),
    },
  });
  return sameDay.find((b) => overlaps(slot.startTime, slot.endTime, b.startTime, b.endTime)) ?? null;
}

/** Parse HTML time input value "HH:MM" (24h) to minutes from midnight. */
export function hallBookingTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** First minute allowed (8:00 a.m.) and last minute allowed for end time (10:00 p.m. inclusive). */
export const HALL_BOOKING_FIRST_MINUTE = 8 * 60;
export const HALL_BOOKING_LAST_END_MINUTE = 22 * 60;

export function validateHallBookingOperatingHours(
  startMinutes: number,
  endMinutes: number
): { ok: true } | { ok: false; error: string } {
  if (startMinutes < HALL_BOOKING_FIRST_MINUTE) {
    return {
      ok: false,
      error: 'Start time must be 8:00 a.m. or later. Bookings are only accepted from 8:00 a.m. to 10:00 p.m.'
    };
  }
  if (endMinutes > HALL_BOOKING_LAST_END_MINUTE) {
    return {
      ok: false,
      error: 'End time must be 10:00 p.m. or earlier. Bookings are only accepted from 8:00 a.m. to 10:00 p.m.'
    };
  }
  return { ok: true };
}

/**
 * Bill in30-minute blocks: ceil(durationMinutes / 30) × ratePer30Minutes.
 * Returns rounded total to 2 decimal places.
 */
export function computeHallBookingCharge(
  startTime: string,
  endTime: string,
  ratePer30Minutes: number
):
  | { ok: true; slots: number; total: number; durationMinutes: number }
  | { ok: false; error: string } {
  const start = hallBookingTimeToMinutes(startTime);
  const end = hallBookingTimeToMinutes(endTime);
  if (start === null || end === null) {
    return { ok: false, error: 'Invalid start or end time' };
  }
  const hoursOk = validateHallBookingOperatingHours(start, end);
  if (!hoursOk.ok) return hoursOk;
  const duration = end - start;
  if (duration <= 0) {
    return { ok: false, error: 'End time must be after start time' };
  }
  const slots = Math.ceil(duration / 30);
  const raw = slots * Math.max(0, ratePer30Minutes);
  const total = Math.round(raw * 100) / 100;
  return { ok: true, slots, total, durationMinutes: duration };
}

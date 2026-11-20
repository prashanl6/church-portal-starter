import { NextResponse } from 'next/server';
import { processBookingAutoCancellations } from '@/lib/bookingAutoCancel';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: cancel APPROVED_PENDING_PAYMENT bookings once payment is not confirmed by 1 hour before start.
 * Secure with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron sends this when CRON_SECRET is set in project env. Schedule: see vercel.json.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  // Without CRON_SECRET the job still runs. That is safe: it only cancels bookings that are
  // already past their payment deadline, exactly as the daily schedule would.

  try {
    const { cancelled } = await processBookingAutoCancellations();
    return NextResponse.json({ ok: true, cancelled });
  } catch (e) {
    console.error('booking-auto-cancel cron', e);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}

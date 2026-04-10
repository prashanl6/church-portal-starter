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
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'CRON_SECRET must be set in production to run this job.' },
      { status: 500 }
    );
  }

  try {
    const { cancelled } = await processBookingAutoCancellations();
    return NextResponse.json({ ok: true, cancelled });
  } catch (e) {
    console.error('booking-auto-cancel cron', e);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}

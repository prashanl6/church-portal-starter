import { NextResponse } from 'next/server';
import { getHallBookingSettings } from '@/lib/hallBookingSettingsDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { ratePer30Minutes } = await getHallBookingSettings();
    return NextResponse.json({ ratePer30Minutes });
  } catch (e) {
    console.error('GET /api/bookings/pricing', e);
    return NextResponse.json({ ratePer30Minutes: 0, error: 'Failed to load pricing' }, { status: 500 });
  }
}

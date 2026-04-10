import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getHallBookingSettings, setHallBookingRatePer30Minutes } from '@/lib/hallBookingSettingsDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  try {
    const settings = await getHallBookingSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error('GET /api/admin/hall-booking-settings', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    const raw = body?.ratePer30Minutes;
    const rate = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!Number.isFinite(rate) || rate < 0) {
      return NextResponse.json({ error: 'ratePer30Minutes must be a non-negative number' }, { status: 400 });
    }
    await setHallBookingRatePer30Minutes(rate);
    const settings = await getHallBookingSettings();
    return NextResponse.json(settings);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to save';
    console.error('PATCH /api/admin/hall-booking-settings', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

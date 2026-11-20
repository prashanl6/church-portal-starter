import { NextResponse } from 'next/server';
import { requireRole, guardAdmin } from '@/lib/auth';
import { submitApproval, hasPendingApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { getHallBookingSettings } from '@/lib/hallBookingSettingsDb';

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

/** A rate change is a money change: one admin proposes, a different admin approves. */
export async function PATCH(req: Request) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const body = await req.json().catch(() => null);
  const raw = body?.ratePer30Minutes;
  const rate = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(rate) || rate < 0) {
    return NextResponse.json({ error: 'Please enter the rate as a number (0 or more).' }, { status: 400 });
  }
  if (await hasPendingApproval('hall_settings', 1)) {
    return NextResponse.json({ error: 'A rate change is already waiting for approval.' }, { status: 409 });
  }
  const before = await getHallBookingSettings();
  const ap = await submitApproval('hall_settings', 1, 'update', g.user.id, { ratePer30Minutes: rate });
  await audit(g.user.id, 'request_update_hall_rate', 'hall_settings', 1, before, { ratePer30Minutes: rate, approvalId: ap.id });
  return NextResponse.json({
    ...before,
    pending: true,
    message: 'The new rate has been sent for approval. The current rate stays until another administrator approves.',
  });
}

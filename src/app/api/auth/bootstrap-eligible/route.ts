import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * True when BOOTSTRAP_ADMIN_SECRET is set and there are fewer than two active administrators
 * (dual control needs two) — shows the first-time setup on /login.
 */
export async function GET() {
  const secret = process.env.BOOTSTRAP_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ eligible: false });
  }
  const count = await prisma.user.count({ where: { role: 'admin', status: 'active' } });
  return NextResponse.json({ eligible: count < 2, adminsNeeded: Math.max(0, 2 - count) });
}

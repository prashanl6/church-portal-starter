import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * True when BOOTSTRAP_ADMIN_SECRET is set and there are zero users — enables setup UI on /login.
 */
export async function GET() {
  const secret = process.env.BOOTSTRAP_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ eligible: false });
  }
  const count = await prisma.user.count();
  return NextResponse.json({ eligible: count === 0 });
}

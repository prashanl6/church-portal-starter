import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const booked = await prisma.booking.findMany({ where: { status: { in: ['APPROVED_PENDING_PAYMENT', 'BOOKED_PAID'] } }, select: { date:true, startTime:true, endTime:true } });
  return NextResponse.json({ booked });
}

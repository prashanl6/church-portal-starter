import { prisma } from '@/lib/prisma';

const SETTINGS_ID = 1;

export async function getHallBookingSettings(): Promise<{ ratePer30Minutes: number }> {
  const row = await prisma.hallBookingSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (row) return { ratePer30Minutes: row.ratePer30Minutes };
  const created = await prisma.hallBookingSettings.create({
    data: { id: SETTINGS_ID, ratePer30Minutes: 0 }
  });
  return { ratePer30Minutes: created.ratePer30Minutes };
}

export async function setHallBookingRatePer30Minutes(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Rate must be a non-negative number');
  }
  await prisma.hallBookingSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ratePer30Minutes: rate },
    update: { ratePer30Minutes: rate }
  });
}

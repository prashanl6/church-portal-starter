import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const quantityTotal = Number(body?.quantityTotal);
  if (!name || !Number.isInteger(quantityTotal) || quantityTotal < 1) {
    return NextResponse.json({ error: 'Please enter the item name and how many the church has (1 or more).' }, { status: 400 });
  }
  const created = await prisma.medicalItem.create({
    data: { name, quantityTotal, quantityAvailable: quantityTotal, notes: body?.notes ? String(body.notes) : null },
  });
  await audit(g.user.id, 'create_medical_item', 'medical_item', created.id, null, created);
  return NextResponse.json({ ok: true, id: created.id });
}

export const dynamic = 'force-dynamic';

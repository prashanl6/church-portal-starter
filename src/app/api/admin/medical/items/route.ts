import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function POST(req: Request) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, quantityTotal, notes } = body;
    
    if (!name || !quantityTotal || quantityTotal < 1) {
      return NextResponse.json({ error: 'Name and quantity (>=1) are required' }, { status: 400 });
    }

    const created = await prisma.medicalItem.create({
      data: {
        name,
        quantityTotal: Number(quantityTotal),
        quantityAvailable: Number(quantityTotal),
        notes: notes || null
      }
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('Error in POST /api/admin/medical/items:', error);
    return NextResponse.json({ error: 'Failed to create medical item' }, { status: 500 });
  }
}


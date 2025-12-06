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
    const { itemId, givenTo, dueDate } = body;
    
    if (!itemId || !givenTo) {
      return NextResponse.json({ error: 'Item and recipient are required' }, { status: 400 });
    }

    // Check availability
    const item = await prisma.medicalItem.findUnique({ where: { id: Number(itemId) } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (item.quantityAvailable < 1) {
      return NextResponse.json({ error: 'Item not available' }, { status: 400 });
    }

    const created = await prisma.medicalLoan.create({
      data: {
        itemId: Number(itemId),
        givenTo,
        givenByUserId: u.id,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    // Update available quantity
    await prisma.medicalItem.update({
      where: { id: Number(itemId) },
      data: { quantityAvailable: item.quantityAvailable - 1 }
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('Error in POST /api/admin/medical/loans:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}


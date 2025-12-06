import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const list = await prisma.peopleEvent.findMany({ 
      orderBy: { date: 'asc' },
      take: 500
    });
    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in GET /api/admin/people:', error);
    return NextResponse.json({ error: 'Failed to fetch people events', list: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { personName, type, date, email, phone, notes } = body;
    
    if (!personName || !type || !date) {
      return NextResponse.json({ error: 'Person name, type, and date are required' }, { status: 400 });
    }

    const created = await prisma.peopleEvent.create({
      data: {
        personName,
        type,
        date: new Date(date),
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        status: 'active'
      }
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('Error in POST /api/admin/people:', error);
    return NextResponse.json({ error: 'Failed to create people event' }, { status: 500 });
  }
}


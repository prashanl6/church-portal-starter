import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole, getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const list = await prisma.processDoc.findMany({ 
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in GET /api/admin/processes:', error);
    return NextResponse.json({ error: 'Failed to fetch processes', list: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, contentHtml } = body;
    
    if (!title || !contentHtml) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const created = await prisma.processDoc.create({
      data: {
        title,
        contentHtml,
        ownerUserId: u.id,
        status: 'submitted'
      }
    });

    await submitApproval('process', created.id, 'publish', u.id);
    await audit(u.id, 'create_draft_process', 'process', created.id, null, created);

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('Error in POST /api/admin/processes:', error);
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}


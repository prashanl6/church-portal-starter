import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  try {
    const id = Number(params.id);
    
    const existing = await prisma.sermon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Sermon not found' }, { status: 404 });
    }

    // Check if there's already a pending delete approval for this sermon
    const existingApproval = await prisma.approval.findFirst({
      where: {
        resourceType: 'sermon',
        resourceId: id,
        action: 'delete',
        status: 'SUBMITTED'
      }
    });

    if (existingApproval) {
      return NextResponse.json({ error: 'Delete request already pending approval' }, { status: 400 });
    }

    // Submit deletion for approval instead of deleting immediately
    await submitApproval('sermon', id, 'delete', u.id);
    await audit(u.id, 'request_delete_sermon', 'sermon', id, existing, null);
    
    return NextResponse.json({ ok: true, message: 'Delete request submitted for approval' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/sermons/[id]:', error);
    return NextResponse.json({ error: 'Failed to submit delete request' }, { status: 500 });
  }
}


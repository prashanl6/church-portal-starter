import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = Number(params.id);
    
    const existing = await prisma.processDoc.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    // Check if there's already a pending update approval for this process
    const existingApproval = await prisma.approval.findFirst({
      where: {
        resourceType: 'process',
        resourceId: id,
        action: { in: ['update', 'delete'] },
        status: 'SUBMITTED'
      }
    });

    if (existingApproval) {
      return NextResponse.json({ 
        error: existingApproval.action === 'delete' 
          ? 'A delete request is already pending for this process' 
          : 'An update request is already pending for this process' 
      }, { status: 400 });
    }

    // Store the update data as JSON in comment1 (temporarily, will be replaced with approver comment)
    const updateData = {
      title: body.title !== undefined ? body.title : existing.title,
      contentHtml: body.contentHtml !== undefined ? body.contentHtml : existing.contentHtml
    };

    // Submit update for approval with update data stored in comment1 as JSON
    const approval = await prisma.approval.create({
      data: {
        resourceType: 'process',
        resourceId: id,
        action: 'update',
        submitterId: u.id,
        status: 'SUBMITTED',
        comment1: JSON.stringify(updateData) // Store update data temporarily
      }
    });

    await audit(u.id, 'request_update_process', 'process', id, existing, updateData);

    return NextResponse.json({ ok: true, id: approval.id });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/processes/[id]:', error);
    return NextResponse.json({ error: 'Failed to submit update request' }, { status: 500 });
  }
}

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
    
    const existing = await prisma.processDoc.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Process document not found' }, { status: 404 });
    }

    // Check if there's already a pending delete approval for this process
    const existingApproval = await prisma.approval.findFirst({
      where: {
        resourceType: 'process',
        resourceId: id,
        action: 'delete',
        status: 'SUBMITTED'
      }
    });

    if (existingApproval) {
      return NextResponse.json({ error: 'Delete request already pending approval' }, { status: 400 });
    }

    // Submit deletion for approval instead of deleting immediately
    await submitApproval('process', id, 'delete', u.id);
    await audit(u.id, 'request_delete_process', 'process', id, existing, null);
    
    return NextResponse.json({ ok: true, message: 'Delete request submitted for approval' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/processes/[id]:', error);
    return NextResponse.json({ error: 'Failed to submit delete request' }, { status: 500 });
  }
}


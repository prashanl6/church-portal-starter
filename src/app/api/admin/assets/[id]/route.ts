import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { assetSchema, firstIssue } from '@/lib/validate';
import { audit } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;
  
  try {
    const body = await req.json();
    const id = Number(params.id);
    
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if there's already a pending update or delete approval for this asset
    const existingApproval = await prisma.approval.findFirst({
      where: {
        resourceType: 'asset',
        resourceId: id,
        action: { in: ['update', 'delete'] },
        status: 'SUBMITTED'
      }
    });

    if (existingApproval) {
      return NextResponse.json({ 
        error: existingApproval.action === 'delete' 
          ? 'A delete request is already pending for this asset' 
          : 'An update request is already pending for this asset' 
      }, { status: 400 });
    }

    // Store the update data as JSON in comment1 (temporarily, will be replaced with approver comment)
    if (existing.status !== 'active') {
      return NextResponse.json({ error: 'This asset is still waiting for approval and cannot be changed yet.' }, { status: 400 });
    }
    const parsed = assetSchema.safeParse({
      reference: body.reference ?? existing.reference,
      value: body.value ?? existing.value,
      quantity: body.quantity ?? existing.quantity,
      labelCategory: body.labelCategory ?? existing.labelCategory,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    });
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    const updateData = parsed.data;

    const approval = await submitApproval('asset', id, 'update', u.id, updateData);

    await audit(u.id, 'request_update_asset', 'asset', id, existing, updateData);
    
    return NextResponse.json({ ok: true, id: approval.id });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/assets/[id]:', error);
    return NextResponse.json({ error: 'Failed to submit update request' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;
  
  try {
    const id = Number(params.id);
    
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    if (existing.status !== 'active') {
      return NextResponse.json({ error: 'This asset is not in the register yet, so it cannot be deleted.' }, { status: 400 });
    }

    // Check if there's already a pending delete approval for this asset
    const existingApproval = await prisma.approval.findFirst({
      where: {
        resourceType: 'asset',
        resourceId: id,
        action: 'delete',
        status: 'SUBMITTED'
      }
    });

    if (existingApproval) {
      return NextResponse.json({ error: 'Delete request already pending approval' }, { status: 400 });
    }

    // Submit deletion for approval instead of deleting immediately
    await submitApproval('asset', id, 'delete', u.id);
    await audit(u.id, 'request_delete_asset', 'asset', id, existing, null);
    
    return NextResponse.json({ ok: true, message: 'Delete request submitted for approval' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/assets/[id]:', error);
    return NextResponse.json({ error: 'Failed to submit delete request' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

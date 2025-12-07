import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export async function GET() {
  // Get all assets including pending ones (those with pending approvals)
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  
  // Get approval status for each asset
  const assetsWithApproval = await Promise.all(assets.map(async (asset) => {
    const approval = await prisma.approval.findFirst({
      where: {
        resourceType: 'asset',
        resourceId: asset.id
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      ...asset,
      approvalStatus: approval ? approval.status : 'APPROVED', // If no approval record, assume approved (old assets)
      approvalAction: approval ? approval.action : null // Include the action type (create, update, delete)
    };
  }));
  
  return NextResponse.json({ list: assetsWithApproval });
}

export async function POST(req: Request) {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  if (u.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const body = await req.json();
  const created = await prisma.asset.create({ data: body });
  await submitApproval('asset', created.id, 'create', u.id);
  await audit(u.id, 'create_draft_asset', 'asset', created.id, null, created);
  return NextResponse.json({ ok: true, id: created.id });
}

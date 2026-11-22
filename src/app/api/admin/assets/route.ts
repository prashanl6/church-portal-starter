import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin, guardStaffOrAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { assetSchema, firstIssue } from '@/lib/validate';

export async function GET() {
  const g = await guardStaffOrAdmin();
  if ('response' in g) return g.response;

  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  const approvals = await prisma.approval.findMany({
    where: { resourceType: 'asset', resourceId: { in: assets.map((a) => a.id) } },
    orderBy: { createdAt: 'desc' },
    select: { resourceId: true, status: true, action: true },
  });
  const latest = new Map<number, { status: string; action: string }>();
  for (const a of approvals) if (!latest.has(a.resourceId)) latest.set(a.resourceId, a);

  const list = assets.map((asset) => {
    const ap = latest.get(asset.id);
    return {
      ...asset,
      approvalStatus: ap ? ap.status : 'APPROVED', // no record = older, already-approved asset
      approvalAction: ap ? ap.action : null,
    };
  });
  return NextResponse.json({ list });
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;

  const parsed = assetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  // Saved as "pending": it is not part of the register until another admin approves.
  const created = await prisma.asset.create({ data: { ...parsed.data, status: 'pending' } });
  await submitApproval('asset', created.id, 'create', u.id, parsed.data);
  await audit(u.id, 'request_create_asset', 'asset', created.id, null, created);
  return NextResponse.json({ ok: true, id: created.id, message: 'Saved. Another administrator must approve it before it appears in the register.' });
}

export const dynamic = 'force-dynamic';

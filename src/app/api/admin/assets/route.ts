import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';

export async function GET() {
  const list = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ list });
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

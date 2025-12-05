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
  if (!u || u.role !== 'admin') return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  const created = await prisma.asset.create({ data: body });
  await submitApproval('asset', created.id, 'create', u.id);
  await audit(u.id, 'create_draft_asset', 'asset', created.id, null, created);
  return NextResponse.json({ ok: true, id: created.id });
}

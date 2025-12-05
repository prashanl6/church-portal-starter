import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';

export async function GET() {
  const list = await prisma.notice.findMany({ orderBy: { weekOf: 'desc' }, take: 50 });
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
  const created = await prisma.notice.create({ data: { ...body, status: 'submitted' } });
  await submitApproval('notice', created.id, 'publish', u.id);
  return NextResponse.json({ ok: true, id: created.id });
}

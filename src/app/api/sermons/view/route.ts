import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { id } = await req.json();
  const s = await prisma.sermon.update({ where: { id: Number(id) }, data: { views: { increment: 1 } } });
  const updated = await prisma.sermon.update({ where: { id: s.id }, data: { rating: s.views + 1 } });
  return NextResponse.json({ ok: true, views: updated.views, rating: updated.rating });
}

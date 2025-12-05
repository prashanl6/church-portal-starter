import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';

export async function GET() {
  const list = await prisma.sermon.findMany({ orderBy: { date: 'desc' }, take: 50 });
  return NextResponse.json({ list });
}

export async function POST(req: Request) {
  const u = getUserFromCookie();
  if (!u || u.role !== 'admin') return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return new NextResponse('Invalid JSON body', { status: 400 });

  // Whitelist and map allowed fields to avoid unexpected prisma errors
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const speaker = typeof body.speaker === 'string' ? body.speaker.trim() : '';
  const link = typeof body.link === 'string' ? body.link.trim() : '';

  // Accept dateIso or date (ISO string). Try to parse to Date.
  const dateStr = typeof body.dateIso === 'string' ? body.dateIso : (typeof body.date === 'string' ? body.date : null);
  let date: Date | null = null;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) date = d;
  }

  if (!title || !speaker || !link || !date) {
    return new NextResponse('Missing required fields: title, speaker, link, date/dateIso', { status: 400 });
  }

  // If `theme` supplied, persist it in `tagsJson` to avoid DB schema changes.
  const theme = typeof body.theme === 'string' && body.theme.trim() ? body.theme.trim() : null;
  const tagsJson = theme ? JSON.stringify({ theme }) : null;

  // Ensure there is only one record per date (compare by day)
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const existing = await prisma.sermon.findFirst({ where: { date: { gte: start, lt: end } } });
  if (existing) {
    return new NextResponse('A sermon for this date already exists', { status: 409 });
  }

  // Prepare dateOnly (UTC midnight) for DB-level uniqueness
  const dateOnly = new Date(start);

  const created = await prisma.sermon.create({
    data: {
      title,
      speaker,
      link,
      date,
      dateOnly,
      status: 'submitted',
      ...(tagsJson ? { tagsJson } : {})
    }
  });

  await submitApproval('sermon', created.id, 'publish', u.id);
  return NextResponse.json({ ok: true, id: created.id });
}

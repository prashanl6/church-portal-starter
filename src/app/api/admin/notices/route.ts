import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { noticeSchema, firstIssue } from '@/lib/validate';
import { sanitizeRichHtml } from '@/lib/sanitizeHtml';
import { hydrateNoticeBodiesWithPeopleSnapshot } from '@/lib/noticePeopleSnapshot';

export async function GET() {
  const list = await prisma.notice.findMany({ orderBy: { weekOf: 'desc' }, take: 50 });
  const hydrated = await hydrateNoticeBodiesWithPeopleSnapshot(list);
  return NextResponse.json({ list: hydrated });
}

export async function POST(req: Request) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;
  const parsed = noticeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const data = { ...parsed.data, bodyHtml: sanitizeRichHtml(parsed.data.bodyHtml) };
  // Not visible to anyone until a different admin approves it.
  const created = await prisma.notice.create({ data: { ...data, status: 'submitted' } });
  await submitApproval('notice', created.id, 'publish', u.id);
  await audit(u.id, 'request_publish_notice', 'notice', created.id, null, created);
  return NextResponse.json({ ok: true, id: created.id, message: 'Saved. Another administrator must approve it before staff can see it.' });
}

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole, guardAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { individualCreateSchema, firstIssue } from '@/lib/validate';
import { isOccasionInNextNDays, occasionMatchesAnyDayInRange } from '@/lib/peopleUpcoming';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const WINDOW_FETCH_CAP = 500;

export async function GET(req: Request) {
  const u = await requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('forSelect') === '1') {
      const list = await prisma.churchIndividual.findMany({
        where: { status: 'active' },
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        take: 2000,
        select: { id: true, displayName: true }
      });
      return NextResponse.json({ list });
    }

    const fromRaw = searchParams.get('fromDate');
    const toRaw = searchParams.get('toDate');
    if (fromRaw || toRaw) {
      if (!fromRaw || !toRaw) {
        return NextResponse.json({ error: 'fromDate and toDate are both required' }, { status: 400 });
      }
      const from = new Date(fromRaw);
      const to = new Date(toRaw);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid fromDate or toDate' }, { status: 400 });
      }
      if (from.getTime() > to.getTime()) {
        return NextResponse.json({ error: 'fromDate must be on or before toDate' }, { status: 400 });
      }
      const candidates = await prisma.churchIndividual.findMany({
        where: {
          status: 'active',
          dateOfDeath: null,
          birthDate: { not: null }
        },
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        take: WINDOW_FETCH_CAP
      });
      const list = candidates.filter(
        (row) => row.birthDate && occasionMatchesAnyDayInRange(row.birthDate, from, to)
      );
      return NextResponse.json({ list, total: list.length, page: 1, pageSize: list.length });
    }

    if (searchParams.get('status') === 'inactive') {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const pageSize = Math.min(
        PAGE_SIZE_MAX,
        Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT)
      );
      const where = { status: 'inactive' as const };
      const [list, total] = await Promise.all([
        prisma.churchIndividual.findMany({
          where,
          orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.churchIndividual.count({ where })
      ]);
      return NextResponse.json({ list, total, page, pageSize });
    }

    const nextDays = parseInt(searchParams.get('nextDays') || '0', 10);
    if (nextDays > 0 && nextDays <= 60) {
      const candidates = await prisma.churchIndividual.findMany({
        where: {
          status: 'active',
          dateOfDeath: null,
          birthDate: { not: null }
        },
        orderBy: [{ birthDate: 'asc' }, { id: 'asc' }]
      });
      const today = new Date();
      const list = candidates.filter(
        (row) => row.birthDate && isOccasionInNextNDays(row.birthDate, today, nextDays)
      );
      return NextResponse.json({ list, total: list.length, page: 1, pageSize: list.length });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT)
    );

    const [list, total] = await Promise.all([
      prisma.churchIndividual.findMany({
        orderBy: [{ birthDate: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.churchIndividual.count()
    ]);

    return NextResponse.json({ list, total, page, pageSize });
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/individuals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch individuals', list: [], total: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;

  const parsed = individualCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  // Nothing is added to the register until a different admin approves.
  const ap = await submitApproval('individual', 0, 'create', u.id, parsed.data);
  await audit(u.id, 'request_create_individual', 'individual', 0, null, { approvalId: ap.id, ...parsed.data });
  return NextResponse.json({
    ok: true,
    approvalId: ap.id,
    message: `${parsed.data.displayName} has been sent for approval. Another administrator must approve before they appear in the register.`,
  });
}

export const dynamic = 'force-dynamic';

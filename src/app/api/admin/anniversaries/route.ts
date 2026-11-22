import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole, guardAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { anniversaryCreateSchema, firstIssue } from '@/lib/validate';
import { isOccasionInNextNDays, occasionMatchesAnyDayInRange } from '@/lib/peopleUpcoming';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const WINDOW_FETCH_CAP = 500;

const includePeople = {
  individualA: { select: { id: true, displayName: true, dateOfDeath: true } },
  individualB: { select: { id: true, displayName: true, dateOfDeath: true } }
};

export async function GET(req: Request) {
  const u = await requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT)
    );

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
      const candidates = await prisma.weddingAnniversary.findMany({
        where: {
          status: 'active',
          individualA: { status: 'active', dateOfDeath: null },
          individualB: { status: 'active', dateOfDeath: null }
        },
        orderBy: [{ anniversaryDate: 'asc' }, { id: 'asc' }],
        take: WINDOW_FETCH_CAP,
        include: includePeople
      });
      const list = candidates.filter(
        (row) =>
          occasionMatchesAnyDayInRange(row.anniversaryDate, from, to) &&
          !row.individualA.dateOfDeath &&
          !row.individualB.dateOfDeath
      );
      return NextResponse.json({ list, total: list.length, page: 1, pageSize: list.length });
    }

    const nextDays = parseInt(searchParams.get('nextDays') || '0', 10);
    if (nextDays > 0 && nextDays <= 60) {
      const candidates = await prisma.weddingAnniversary.findMany({
        where: {
          status: 'active',
          individualA: { status: 'active', dateOfDeath: null },
          individualB: { status: 'active', dateOfDeath: null }
        },
        orderBy: [{ anniversaryDate: 'asc' }, { id: 'asc' }],
        include: includePeople
      });
      const today = new Date();
      const list = candidates.filter((row) =>
        isOccasionInNextNDays(row.anniversaryDate, today, nextDays)
      );
      return NextResponse.json({ list, total: list.length, page: 1, pageSize: list.length });
    }

    if (searchParams.get('status') === 'inactive') {
      const where = { status: 'inactive' as const };
      const [list, total] = await Promise.all([
        prisma.weddingAnniversary.findMany({
          where,
          orderBy: [{ anniversaryDate: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: includePeople
        }),
        prisma.weddingAnniversary.count({ where })
      ]);
      return NextResponse.json({ list, total, page, pageSize });
    }

    const include = {
      individualA: { select: { id: true, displayName: true } },
      individualB: { select: { id: true, displayName: true } }
    };

    const [list, total] = await Promise.all([
      prisma.weddingAnniversary.findMany({
        orderBy: [{ anniversaryDate: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include
      }),
      prisma.weddingAnniversary.count()
    ]);

    return NextResponse.json({ list, total, page, pageSize });
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/anniversaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anniversaries', list: [], total: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;

  const parsed = anniversaryCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { individualAId, individualBId } = parsed.data;
  if (individualAId === individualBId) {
    return NextResponse.json({ error: 'Please choose two different people.' }, { status: 400 });
  }
  const found = await prisma.churchIndividual.count({ where: { id: { in: [individualAId, individualBId] } } });
  if (found !== 2) return NextResponse.json({ error: 'One of the people was not found in the register.' }, { status: 400 });

  const ap = await submitApproval('anniversary', 0, 'create', u.id, parsed.data);
  await audit(u.id, 'request_create_anniversary', 'anniversary', 0, null, { approvalId: ap.id, ...parsed.data });
  return NextResponse.json({
    ok: true,
    approvalId: ap.id,
    message: 'The anniversary has been sent for approval. Another administrator must approve it.',
  });
}

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { isOccasionInNextNDays, occasionMatchesAnyDayInRange } from '@/lib/peopleUpcoming';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const WINDOW_FETCH_CAP = 500;

const includePeople = {
  individualA: { select: { id: true, displayName: true, dateOfDeath: true } },
  individualB: { select: { id: true, displayName: true, dateOfDeath: true } }
};

export async function GET(req: Request) {
  const u = requireRole(['admin', 'staff']);
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
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const individualAId = Number(body.individualAId);
    const individualBId = Number(body.individualBId);
    const { anniversaryDate, notes } = body;

    if (!individualAId || !individualBId || !anniversaryDate) {
      return NextResponse.json(
        { error: 'Two individuals and anniversary date are required' },
        { status: 400 }
      );
    }
    if (individualAId === individualBId) {
      return NextResponse.json({ error: 'Choose two different individuals' }, { status: 400 });
    }

    const [a, b] = await Promise.all([
      prisma.churchIndividual.findUnique({ where: { id: individualAId } }),
      prisma.churchIndividual.findUnique({ where: { id: individualBId } })
    ]);
    if (!a || !b) {
      return NextResponse.json({ error: 'Individual not found' }, { status: 400 });
    }

    const created = await prisma.weddingAnniversary.create({
      data: {
        individualAId,
        individualBId,
        anniversaryDate: new Date(anniversaryDate),
        notes: notes || null,
        status: 'active'
      }
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: unknown) {
    console.error('Error in POST /api/admin/anniversaries:', error);
    return NextResponse.json({ error: 'Failed to create anniversary' }, { status: 500 });
  }
}

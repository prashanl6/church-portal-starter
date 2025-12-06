import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';

export async function GET() {
  try {
    const list = await prisma.sermon.findMany({ orderBy: { date: 'desc' }, take: 50 });
    return NextResponse.json({ list });
  } catch (error: any) {
    console.error('Error in GET /api/admin/sermons:', error);
    return NextResponse.json({ error: 'Failed to fetch sermons', list: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const u = getUserFromCookie();
    if (!u) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
    }
    if (u.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Whitelist and map allowed fields to avoid unexpected prisma errors
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const speaker = typeof body.speaker === 'string' ? body.speaker.trim() : '';
    const link = typeof body.link === 'string' ? body.link.trim() : '';

    // Accept dateIso or date (ISO string). Try to parse to Date.
    const dateStr = typeof body.dateIso === 'string' ? body.dateIso : (typeof body.date === 'string' ? body.date : null);
    let date: Date | null = null;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        date = d;
      } else {
        return NextResponse.json({ 
          error: 'Invalid date format. Please select a valid date.' 
        }, { status: 400 });
      }
    }

    if (!title || !speaker || !link || !date) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, speaker, link, and date are required' 
      }, { status: 400 });
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
      return NextResponse.json({ 
        error: `A sermon for ${new Date(date).toLocaleDateString()} already exists` 
      }, { status: 409 });
    }

    // Prepare dateOnly (UTC midnight) for DB-level uniqueness
    // Ensure dateOnly is set to UTC midnight to match the unique constraint
    const dateOnly = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));

    let created;
    try {
      created = await prisma.sermon.create({
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
    } catch (dbError: any) {
      // Handle database errors (e.g., unique constraint violations)
      if (dbError.code === 'P2002') {
        return NextResponse.json({ 
          error: 'A sermon for this date already exists in the database' 
        }, { status: 409 });
      }
      console.error('Database error creating sermon:', dbError);
      console.error('Error details:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta
      });
      // Return more specific error message for debugging
      const errorMessage = dbError.message || dbError.toString() || 'Failed to create sermon';
      return NextResponse.json({ 
        error: errorMessage.includes('dateOnly') || errorMessage.includes('unique')
          ? 'A sermon for this date already exists'
          : errorMessage.includes('required') || errorMessage.includes('NOT NULL')
          ? 'Missing required fields: ' + errorMessage
          : `Database error: ${errorMessage}`
      }, { status: 500 });
    }

    try {
      await submitApproval('sermon', created.id, 'publish', u.id);
    } catch (approvalError: any) {
      console.error('Error submitting approval:', approvalError);
      // Don't fail the whole request if approval submission fails
      // The sermon was created, so we'll still return success
    }

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/admin/sermons:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
}

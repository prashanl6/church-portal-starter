import { NextResponse } from 'next/server';
import { reject } from '@/lib/approval';
import { getUserFromCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { resourceType, resourceId, comment } = await req.json();
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  try {
    const result = await reject(resourceType, Number(resourceId), u.id, comment || '');
    return NextResponse.json({ ok: true, result });
  } catch (e:any) {
    return new NextResponse(e.message, { status: 400 });
  }
}


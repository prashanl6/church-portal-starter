import { NextResponse } from 'next/server';
import { reject } from '@/lib/approval';
import { getUserFromCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { resourceType, resourceId, comment } = await req.json();
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }
  
  // For bookings, comment is mandatory
  if (resourceType === 'booking' && (!comment || comment.trim() === '')) {
    return NextResponse.json({ error: 'Rejection reason is required for booking rejections' }, { status: 400 });
  }
  
  try {
    const result = await reject(resourceType, Number(resourceId), u.id, comment || '');
    return NextResponse.json({ ok: true, result });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}


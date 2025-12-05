import { NextResponse } from 'next/server';
import { approve } from '@/lib/approval';
import { getUserFromCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { resourceType, resourceId, comment } = await req.json();
  const u = getUserFromCookie();
  if (!u) return new NextResponse('Unauthorized', { status: 401 });
  try {
    const result = await approve(resourceType, Number(resourceId), u.id, comment || '');
    return NextResponse.json({ ok: true, result });
  } catch (e:any) {
    return new NextResponse(e.message, { status: 400 });
  }
}

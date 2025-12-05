import { NextResponse } from 'next/server';
import { login, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const token = await login(email, password);
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  setAuthCookie(token);
  return NextResponse.json({ ok: true });
}

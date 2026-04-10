import { NextResponse } from 'next/server';
import { login, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const token = await login(email, password);
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
  return res;
}

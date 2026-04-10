import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = getAuthCookieOptions();
  res.cookies.set(AUTH_COOKIE_NAME, '', { ...opts, maxAge: 0 });
  return res;
}


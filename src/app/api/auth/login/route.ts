import { NextResponse } from 'next/server';
import { login, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await login(String(body?.email ?? ''), String(body?.password ?? ''));
  if (!result.ok) {
    if (result.reason === 'locked') {
      return NextResponse.json(
        {
          error: 'account_locked',
          message: `Too many wrong passwords. For safety this account is locked for ${result.minutes} minutes. Please try again later.`,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'invalid_credentials', message: 'The email or password is not correct. Please try again.' },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
  return res;
}

export const dynamic = 'force-dynamic';

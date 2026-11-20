import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Sends logged-out visitors on /admin pages to the login page.
 *
 * This is a convenience redirect only. Every /api route checks the signed login token itself
 * (see src/lib/auth.ts), so no data is exposed even if this check is bypassed.
 * (This file must live in src/ because the app uses the src/ directory; at the project root
 * Next.js silently ignored it.)
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.get('token')?.value) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

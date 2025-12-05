import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const ADMIN_PATH_PREFIX = '/admin';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(ADMIN_PATH_PREFIX) || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      if (payload.role !== 'admin' && payload.role !== 'staff') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

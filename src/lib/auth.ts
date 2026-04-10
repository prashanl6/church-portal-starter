import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const AUTH_COOKIE_NAME = 'token';

/** Options for auth cookie on NextResponse (HTTPS on Vercel requires secure: true). */
export function getAuthCookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 8, // matches JWT expiresIn
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  return token;
}

export function getUserFromCookie(): { id: number, role: string, email: string } | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return { id: Number(payload.sub), role: payload.role, email: payload.email };
    } catch (err) {
      // Token expired or invalid
      return null;
    }
  } catch (err) {
    // Error reading cookies
    return null;
  }
}

export function requireRole(roles: Array<'admin'|'staff'>) {
  const u = getUserFromCookie();
  if (!u || !roles.includes(u.role as any)) return null;
  return u;
}

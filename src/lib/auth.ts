import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

/**
 * JWT signing secret. Never a guessable constant in production: with the old "dev-secret"
 * fallback anyone could forge an admin login.
 *
 * Order: JWT_SECRET if set; otherwise a key derived from DATABASE_URL (already a server-only
 * secret, and anyone holding it controls the data anyway). Changing either logs everyone out.
 */
export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16 && s !== 'your-secret-key-here') return s;
  if (process.env.NODE_ENV === 'production') {
    const db = process.env.DATABASE_URL;
    if (!db) throw new Error('Set JWT_SECRET (or DATABASE_URL) in production.');
    return createHash('sha256').update(`church-portal-jwt:${db}`).digest('hex');
  }
  return 'dev-secret-only-for-local-development';
}

export const AUTH_COOKIE_NAME = 'token';

/**
 * Options for the auth cookie. It is HTTPS-only whenever the site is served over HTTPS
 * (always on Vercel); a production build tried locally over http://localhost still works.
 */
export function getAuthCookieOptions(req?: Request): {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const isProd = process.env.NODE_ENV === 'production';
  const proto = req
    ? req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || new URL(req.url).protocol.replace(':', '')
    : 'https';
  const host = req ? (req.headers.get('host') || '').split(':')[0] : '';
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd && !(local && proto === 'http'),
    path: '/',
    maxAge: 60 * 60 * 8, // matches JWT expiresIn
  };
}

let _dummy: string | null = null;
function dummyHash() {
  return (_dummy ??= bcrypt.hashSync('not-a-real-password', 10));
}

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'invalid' | 'locked'; minutes?: number };

export async function login(emailRaw: string, password: string): Promise<LoginResult> {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!email || !password) return { ok: false, reason: 'invalid' };
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  // Only active admin/staff accounts can log in (never the internal system user).
  if (!user || user.status !== 'active' || (user.role !== 'admin' && user.role !== 'staff')) {
    await bcrypt.compare(password, dummyHash()); // even out timing so emails can't be probed
    return { ok: false, reason: 'invalid' };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked', minutes: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000) };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    return lock ? { ok: false, reason: 'locked', minutes: LOCK_MINUTES } : { ok: false, reason: 'invalid' };
  }
  if (user.failedLoginCount || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, getJwtSecret(), { expiresIn: '8h' });
  return { ok: true, token };
}

export function getUserFromCookie(): { id: number; role: string; email: string } | null {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, getJwtSecret()) as any;
    return { id: Number(payload.sub), role: payload.role, email: payload.email };
  } catch {
    // Missing, expired or invalid token
    return null;
  }
}

export function requireRole(roles: Array<'admin' | 'staff'>) {
  const u = getUserFromCookie();
  if (!u || !roles.includes(u.role as any)) return null;
  return u;
}

/**
 * For write routes: returns the logged-in admin, or a ready-made error response.
 * Usage: const g = guardAdmin(); if ('response' in g) return g.response; const u = g.user;
 */
export function guardAdmin():
  | { user: { id: number; role: string; email: string } }
  | { response: NextResponse } {
  const u = getUserFromCookie();
  if (!u) return { response: NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 }) };
  if (u.role !== 'admin') {
    return {
      response: NextResponse.json(
        { error: 'Only administrators can make changes. Staff accounts can view only.' },
        { status: 403 }
      ),
    };
  }
  return { user: u };
}

/** For read routes used by admins and staff. */
export function guardStaffOrAdmin():
  | { user: { id: number; role: string; email: string } }
  | { response: NextResponse } {
  const u = requireRole(['admin', 'staff']);
  if (!u) return { response: NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 }) };
  return { user: u };
}

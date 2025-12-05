import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  return token;
}

export function setAuthCookie(token: string) {
  cookies().set('token', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
}

export function clearAuthCookie() {
  cookies().set('token', '', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 0 });
}

export function getUserFromCookie(): { id: number, role: string, email: string } | null {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(payload.sub), role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

export function requireRole(roles: Array<'admin'|'staff'>) {
  const u = getUserFromCookie();
  if (!u || !roles.includes(u.role as any)) return null;
  return u;
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * One-time creation of the first admin user when the database has no users.
 * Set BOOTSTRAP_ADMIN_SECRET in env, POST { secret, email, password, name }.
 * Remove or unset the secret after onboarding. Returns 404 if secret is not configured.
 */
export async function POST(req: Request) {
  const expected = process.env.BOOTSTRAP_ADMIN_SECRET?.trim();
  if (!expected) {
    return new NextResponse(null, { status: 404 });
  }

  let body: { secret?: string; email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: 'Users already exist' }, { status: 403 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : 'Admin';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, role: 'admin', passwordHash },
  });

  return NextResponse.json({ ok: true, email });
}

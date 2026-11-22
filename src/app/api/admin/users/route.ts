import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardAdmin } from '@/lib/auth';
import { submitApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { firstIssue } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SYSTEM_EMAIL = 'system@church.local';

/** Staff and administrator accounts (never the internal system account). */
export async function GET() {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const list = await prisma.user.findMany({
    where: { email: { not: SYSTEM_EMAIL }, role: { in: ['admin', 'staff'] } },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: [{ status: 'asc' }, { role: 'asc' }, { name: 'asc' }],
  });
  const pending = await prisma.approval.count({ where: { resourceType: 'user', status: 'SUBMITTED' } });
  return NextResponse.json({ list, pending });
}

const accountSchema = z.object({
  name: z.string().trim().min(2, 'Please enter the person’s name.').max(150),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(200),
  role: z.enum(['admin', 'staff'], { errorMap: () => ({ message: 'Please choose Staff or Administrator.' }) }),
  password: z.string().min(8, 'The first password must have at least 8 characters.').max(200),
});

/** Ask for a new account. It is created only when a different administrator approves. */
export async function POST(req: Request) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const parsed = accountSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { name, email, role, password } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (exists) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  // Only the hash is stored, never the password itself.
  const passwordHash = await bcrypt.hash(password, 10);
  const ap = await submitApproval('user', 0, 'create', g.user.id, { name, email, role, passwordHash });
  await audit(g.user.id, 'request_create_user', 'user', 0, null, { approvalId: ap.id, name, email, role });
  return NextResponse.json({
    ok: true,
    approvalId: ap.id,
    message: `${name}'s account has been sent for approval. Another administrator must approve it before they can log in.`,
  });
}

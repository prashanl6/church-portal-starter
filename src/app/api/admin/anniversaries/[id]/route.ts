import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { submitApproval, hasPendingApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { anniversaryUpdateSchema, firstIssue, definedOnly } from '@/lib/validate';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;
  const id = Number(params.id);

  const existing = await prisma.weddingAnniversary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'This anniversary was not found.' }, { status: 404 });

  const parsed = anniversaryUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const changes = definedOnly(parsed.data);
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'Nothing was changed.' }, { status: 400 });

  const a = changes.individualAId ?? existing.individualAId;
  const b = changes.individualBId ?? existing.individualBId;
  if (a === b) return NextResponse.json({ error: 'Please choose two different people.' }, { status: 400 });

  if (await hasPendingApproval('anniversary', id)) {
    return NextResponse.json(
      { error: 'A change for this anniversary is already waiting for approval.' },
      { status: 409 }
    );
  }

  const ap = await submitApproval('anniversary', id, 'update', u.id, changes);
  await audit(u.id, 'request_update_anniversary', 'anniversary', id, existing, changes);
  return NextResponse.json({ ok: true, approvalId: ap.id, message: 'Your change has been sent for approval.' });
}

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { submitApproval, hasPendingApproval } from '@/lib/approval';
import { audit } from '@/lib/audit';
import { individualUpdateSchema, firstIssue, definedOnly } from '@/lib/validate';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const u = g.user;
  const id = Number(params.id);

  const existing = await prisma.churchIndividual.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'This person was not found.' }, { status: 404 });

  const parsed = individualUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const changes = definedOnly(parsed.data);
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'Nothing was changed.' }, { status: 400 });
  }

  // A person marked inactive (deceased) must have a date of death.
  const nextDeath = changes.dateOfDeath !== undefined ? changes.dateOfDeath : existing.dateOfDeath;
  if (changes.status === 'inactive' && !nextDeath) {
    return NextResponse.json(
      { error: 'To mark someone as passed away, please open their details and enter the date of death.' },
      { status: 400 }
    );
  }
  if (changes.status === 'active' && nextDeath) {
    return NextResponse.json(
      { error: 'This person has a date of death. Clear the date of death first if it was entered by mistake.' },
      { status: 400 }
    );
  }
  if (changes.dateOfDeath === null && existing.dateOfDeath && changes.status === undefined) {
    changes.status = 'active';
  }

  if (await hasPendingApproval('individual', id)) {
    return NextResponse.json(
      { error: 'A change for this person is already waiting for approval. Please wait until it is approved or rejected.' },
      { status: 409 }
    );
  }

  const ap = await submitApproval('individual', id, 'update', u.id, changes);
  await audit(u.id, 'request_update_individual', 'individual', id, existing, changes);
  return NextResponse.json({
    ok: true,
    approvalId: ap.id,
    message: 'Your change has been sent for approval. It will show once another administrator approves it.',
  });
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { reject, ApprovalError } from '@/lib/approval';
import { guardAdmin } from '@/lib/auth';

export async function POST(req: Request) {
  const g = guardAdmin();
  if ('response' in g) return g.response;
  const body = await req.json().catch(() => ({}));
  const approvalId = Number(body?.approvalId);
  try {
    const result = Number.isInteger(approvalId) && approvalId > 0
      ? await reject({ approvalId }, g.user.id, String(body?.comment ?? ''))
      : await reject({ resourceType: String(body?.resourceType), resourceId: Number(body?.resourceId) }, g.user.id, String(body?.comment ?? ''));
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    const status = e instanceof ApprovalError ? e.status : 500;
    if (status === 500) console.error('reject failed', e);
    return NextResponse.json({ error: status === 500 ? 'Something went wrong. Nothing was changed.' : e.message }, { status });
  }
}

export const dynamic = 'force-dynamic';

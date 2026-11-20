/**
 * Maker–checker approval engine.
 *
 * Rule (agreed with the church): one admin submits a change (the maker) and a DIFFERENT,
 * active admin approves it (the checker). Nothing goes live until the checker approves.
 * Staff can view the queue but can never approve or reject.
 *
 * Public hall-booking requests are submitted by the internal "system" user, so any admin
 * may act on them.
 *
 * Every approve/reject is written to the audit log with maker and checker.
 */
import type { Approval, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';
import { audit } from './audit';
import { deleteProcessAttachmentsByIds, unlinkProcessAttachmentFiles } from './processAttachmentFs';
import { deleteStoredFiles } from './storedFiles';
import { findBookingClash } from './bookingClash';

type Tx = Prisma.TransactionClient;

export class ApprovalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const SYSTEM_EMAIL = 'system@church.local';

/** Internal user that "submits" public booking requests. It can never log in. */
export async function getOrCreateSystemUser() {
  let systemUser = await prisma.user.findUnique({ where: { email: SYSTEM_EMAIL } });
  if (!systemUser) {
    // Random, unknowable password: this account must never be usable for login.
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    systemUser = await prisma.user.create({
      data: { name: 'Website (public request)', email: SYSTEM_EMAIL, passwordHash: hash, role: 'guest', status: 'disabled' },
    });
  }
  return systemUser;
}

export async function submitApproval(
  resourceType: string,
  resourceId: number,
  action: string,
  submitterId: number,
  payload?: unknown
) {
  return prisma.approval.create({
    data: {
      resourceType,
      resourceId,
      action,
      submitterId,
      status: 'SUBMITTED',
      payloadJson: payload === undefined ? null : JSON.stringify(payload),
    },
  });
}

/** True when an approval of this resource is already waiting. */
export async function hasPendingApproval(resourceType: string, resourceId: number, actions?: string[]) {
  const row = await prisma.approval.findFirst({
    where: { resourceType, resourceId, status: 'SUBMITTED', ...(actions ? { action: { in: actions } } : {}) },
    select: { id: true },
  });
  return !!row;
}

/** Proposed data for an approval. Older rows stored it in comment1. */
export function readPayload(a: Pick<Approval, 'payloadJson' | 'comment1' | 'status'>): any {
  const raw = a.payloadJson ?? (a.status === 'SUBMITTED' ? a.comment1 : null);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type Locator = { approvalId?: number; resourceType?: string; resourceId?: number };

async function findPending(loc: Locator): Promise<Approval> {
  const a = loc.approvalId
    ? await prisma.approval.findUnique({ where: { id: loc.approvalId } })
    : await prisma.approval.findFirst({
        where: { resourceType: loc.resourceType, resourceId: loc.resourceId, status: 'SUBMITTED' },
        orderBy: { createdAt: 'asc' },
      });
  if (!a) throw new ApprovalError('This request could not be found.', 404);
  if (a.status !== 'SUBMITTED') throw new ApprovalError('This request has already been dealt with.', 409);
  return a;
}

async function assertChecker(a: Approval, userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    throw new ApprovalError('Only an administrator can approve or reject changes.', 403);
  }
  if (a.submitterId === userId) {
    throw new ApprovalError('You made this change, so a different administrator must approve or reject it.', 403);
  }
}

/** Atomically move SUBMITTED -> status so two admins clicking at once cannot both act. */
async function claim(tx: Tx, a: Approval, status: 'APPROVED' | 'REJECTED', userId: number, comment: string) {
  const res = await tx.approval.updateMany({
    where: { id: a.id, status: 'SUBMITTED' },
    data: { status, approver1Id: userId, comment1: comment || (status === 'APPROVED' ? 'Approved' : '') },
  });
  if (res.count === 0) throw new ApprovalError('This request has already been dealt with.', 409);
}

type Outcome = { before?: unknown; after?: unknown; resourceId?: number; afterCommit?: () => Promise<void> };

function bookingEmailDetails(b: any) {
  return {
    bookingRef: b.bookingRef,
    requesterName: b.requesterName,
    email: b.email,
    phone: b.phone,
    hall: b.hall,
    date: b.date.toISOString(),
    startTime: b.startTime,
    endTime: b.endTime,
    purpose: b.purpose,
    amount: b.amount ?? undefined,
    paymentRef: b.paymentRef ?? undefined,
  };
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
}

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Field updates for a ChurchIndividual from a validated payload. */
function individualData(p: any): Prisma.ChurchIndividualUncheckedUpdateInput {
  const data: Prisma.ChurchIndividualUncheckedUpdateInput = {};
  if (p.displayName !== undefined) data.displayName = String(p.displayName);
  if (p.birthDate !== undefined) data.birthDate = toDate(p.birthDate);
  if (p.email !== undefined) data.email = p.email || null;
  if (p.phone !== undefined) data.phone = p.phone || null;
  if (p.notes !== undefined) data.notes = p.notes || null;
  if (p.status !== undefined) data.status = p.status;
  if (p.dateOfDeath !== undefined) {
    data.dateOfDeath = toDate(p.dateOfDeath);
    if (data.dateOfDeath) data.status = 'inactive';
  }
  return data;
}

function anniversaryData(p: any): Prisma.WeddingAnniversaryUncheckedUpdateInput {
  const data: Prisma.WeddingAnniversaryUncheckedUpdateInput = {};
  if (p.individualAId !== undefined) data.individualAId = Number(p.individualAId);
  if (p.individualBId !== undefined) data.individualBId = Number(p.individualBId);
  if (p.anniversaryDate !== undefined) data.anniversaryDate = toDate(p.anniversaryDate) as Date;
  if (p.notes !== undefined) data.notes = p.notes || null;
  if (p.status !== undefined) data.status = p.status;
  return data;
}

async function applyApproved(tx: Tx, a: Approval, payload: any): Promise<Outcome> {
  const id = a.resourceId;
  const key = `${a.resourceType}:${a.action}`;
  switch (key) {
    case 'asset:create': {
      const after = await tx.asset.update({ where: { id }, data: { status: 'active' } });
      return { after };
    }
    case 'asset:update': {
      if (!payload) throw new ApprovalError('The proposed changes are missing.');
      const before = await tx.asset.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This asset no longer exists.');
      const after = await tx.asset.update({
        where: { id },
        data: {
          reference: payload.reference,
          value: payload.value,
          quantity: payload.quantity,
          labelCategory: payload.labelCategory,
          notes: payload.notes,
        },
      });
      return { before, after };
    }
    case 'asset:delete': {
      const before = await tx.asset.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This asset no longer exists.');
      await tx.asset.delete({ where: { id } });
      return { before, after: { deleted: true } };
    }

    case 'notice:publish':
    case 'sermon:publish': {
      const model: any = a.resourceType === 'notice' ? tx.notice : tx.sermon;
      const after = await model.update({ where: { id }, data: { status: 'published' } });
      return { after };
    }
    case 'notice:delete':
    case 'sermon:delete': {
      const model: any = a.resourceType === 'notice' ? tx.notice : tx.sermon;
      const before = await model.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This item no longer exists.');
      await model.delete({ where: { id } });
      return { before, after: { deleted: true } };
    }

    case 'process:publish': {
      const after = await tx.processDoc.update({ where: { id }, data: { status: 'published' } });
      await tx.processAttachment.updateMany({ where: { processDocId: id, status: 'pending' }, data: { status: 'active' } });
      return { after };
    }
    case 'process:update': {
      const before = await tx.processDoc.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This process document no longer exists.');
      const p = payload || {};
      const audience = p.audience === 'public' || p.audience === 'steward' ? p.audience : before.audience;
      const after = await tx.processDoc.update({
        where: { id },
        data: {
          title: p.title ?? before.title,
          contentHtml: p.contentHtml ?? before.contentHtml,
          audience,
          version: before.version + 1,
        },
      });
      await tx.processAttachment.updateMany({ where: { processDocId: id, status: 'pending' }, data: { status: 'active' } });
      if (Array.isArray(p.removeAttachmentIds) && p.removeAttachmentIds.length) {
        await deleteProcessAttachmentsByIds(id, p.removeAttachmentIds.map(Number), tx);
      }
      return { before, after };
    }
    case 'process:delete': {
      const before = await tx.processDoc.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This process document no longer exists.');
      await unlinkProcessAttachmentFiles(id, tx);
      await tx.processDoc.delete({ where: { id } });
      return { before, after: { deleted: true } };
    }

    case 'booking:approve': {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new ApprovalError('This booking no longer exists.');
      if (b.status !== 'REQUESTED') throw new ApprovalError(`This booking is ${b.status} and cannot be approved.`);
      const clash = await findBookingClash(tx, { hall: b.hall, date: b.date, startTime: b.startTime, endTime: b.endTime, excludeId: b.id });
      if (clash) {
        throw new ApprovalError(
          `This time clashes with booking ${clash.bookingRef} (${clash.startTime}–${clash.endTime}), which is already approved. Please reject this request.`
        );
      }
      const after = await tx.booking.update({ where: { id }, data: { status: 'APPROVED_PENDING_PAYMENT' } });
      return {
        before: { status: b.status },
        after: { status: after.status },
        afterCommit: async () => {
          const { sendBookingApprovalEmail } = await import('./email');
          await sendBookingApprovalEmail(bookingEmailDetails(after), baseUrl());
        },
      };
    }
    case 'booking:confirm_payment': {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new ApprovalError('This booking no longer exists.');
      if (b.status !== 'APPROVED_PENDING_PAYMENT') throw new ApprovalError(`This booking is ${b.status}; payment cannot be confirmed.`);
      if (!b.slipFileId && !b.slipUrl) throw new ApprovalError('No payment slip has been uploaded yet.');
      const after = await tx.booking.update({ where: { id }, data: { status: 'BOOKED_PAID' } });
      return {
        before: { status: b.status },
        after: { status: after.status, paymentRef: after.paymentRef, amount: after.amount },
        afterCommit: async () => {
          const { sendBookingPaymentConfirmedEmail } = await import('./email');
          await sendBookingPaymentConfirmedEmail(bookingEmailDetails(after));
        },
      };
    }
    case 'booking:delete': {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new ApprovalError('This booking no longer exists.');
      if (b.status === 'BOOKED_PAID') throw new ApprovalError('Paid bookings cannot be cancelled.');
      await tx.booking.delete({ where: { id } });
      await deleteStoredFiles([b.slipFileId], tx);
      return { before: b, after: { deleted: true } };
    }

    case 'church_bank_account:update': {
      const proposal = await tx.churchBankAccountProposal.findUnique({ where: { id } });
      if (!proposal) throw new ApprovalError('Bank account proposal not found.');
      if (proposal.status !== 'PENDING') throw new ApprovalError('This proposal is no longer pending.');
      const fields = {
        accountNumber: proposal.accountNumber,
        accountName: proposal.accountName,
        bankName: proposal.bankName,
        branch: proposal.branch,
      };
      const before = await tx.churchBankAccount.findUnique({ where: { id: 1 } });
      await tx.churchBankAccount.upsert({ where: { id: 1 }, create: { id: 1, ...fields }, update: fields });
      await tx.churchBankAccountProposal.update({ where: { id: proposal.id }, data: { status: 'APPROVED' } });
      return { before, after: fields };
    }

    case 'hall_settings:update': {
      const rate = Number(payload?.ratePer30Minutes);
      if (!Number.isFinite(rate) || rate < 0) throw new ApprovalError('The proposed rate is not valid.');
      const before = await tx.hallBookingSettings.findUnique({ where: { id: 1 } });
      await tx.hallBookingSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ratePer30Minutes: rate },
        update: { ratePer30Minutes: rate },
      });
      return { before, after: { ratePer30Minutes: rate } };
    }

    case 'individual:create': {
      const created = await tx.churchIndividual.create({
        data: { ...(individualData(payload) as any), displayName: String(payload.displayName), status: payload.status || 'active' },
      });
      await tx.approval.update({ where: { id: a.id }, data: { resourceId: created.id } });
      return { after: created, resourceId: created.id };
    }
    case 'individual:update': {
      const before = await tx.churchIndividual.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This person no longer exists in the register.');
      const after = await tx.churchIndividual.update({ where: { id }, data: individualData(payload) });
      return { before, after };
    }
    case 'anniversary:create': {
      const created = await tx.weddingAnniversary.create({
        data: { ...(anniversaryData(payload) as any), status: 'active' },
      });
      await tx.approval.update({ where: { id: a.id }, data: { resourceId: created.id } });
      return { after: created, resourceId: created.id };
    }
    case 'anniversary:update': {
      const before = await tx.weddingAnniversary.findUnique({ where: { id } });
      if (!before) throw new ApprovalError('This anniversary no longer exists.');
      const after = await tx.weddingAnniversary.update({ where: { id }, data: anniversaryData(payload) });
      return { before, after };
    }
  }
  throw new ApprovalError(`Unknown request type: ${a.resourceType} / ${a.action}`);
}

async function applyRejected(tx: Tx, a: Approval, comment: string): Promise<Outcome> {
  const id = a.resourceId;
  switch (`${a.resourceType}:${a.action}`) {
    case 'asset:create':
      await tx.asset.updateMany({ where: { id }, data: { status: 'rejected' } });
      return {};
    case 'notice:publish':
      await tx.notice.updateMany({ where: { id }, data: { status: 'rejected' } });
      return {};
    case 'sermon:publish':
      await tx.sermon.updateMany({ where: { id }, data: { status: 'rejected' } });
      return {};
    case 'process:publish':
      await tx.processDoc.updateMany({ where: { id }, data: { status: 'rejected' } });
      return {};
    case 'process:update': {
      // Files added as part of this change are discarded.
      const pending = await tx.processAttachment.findMany({ where: { processDocId: id, status: 'pending' }, select: { id: true } });
      await deleteProcessAttachmentsByIds(id, pending.map((p) => p.id), tx);
      return {};
    }
    case 'church_bank_account:update':
      await tx.churchBankAccountProposal.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED' } });
      return {};
    case 'booking:approve': {
      const b = await tx.booking.update({ where: { id }, data: { status: 'REJECTED' } });
      return {
        afterCommit: async () => {
          const { sendBookingRejectionEmail } = await import('./email');
          await sendBookingRejectionEmail(bookingEmailDetails(b), comment);
        },
      };
    }
    case 'booking:confirm_payment': {
      // Slip not accepted: clear it so the person can upload a correct one before the deadline.
      const b = await tx.booking.findUnique({ where: { id } });
      if (b && b.status === 'APPROVED_PENDING_PAYMENT') {
        await tx.booking.update({ where: { id }, data: { slipFileId: null, slipUrl: null, paymentRef: null } });
        await deleteStoredFiles([b.slipFileId], tx);
      }
      return {};
    }
  }
  return {};
}

async function runAfterCommit(o: Outcome) {
  if (!o.afterCommit) return;
  try {
    await o.afterCommit();
  } catch (e) {
    // Email failures must not undo an approval; they are logged for follow-up.
    console.error('Approval follow-up (email) failed:', e);
  }
}

export async function approve(
  resourceTypeOrLocator: string | Locator,
  resourceIdOrApprover: number,
  approverIdOrComment?: number | string,
  maybeComment?: string
) {
  // Supports approve({approvalId}, approverId, comment) and the older approve(type, id, approverId, comment).
  const loc: Locator =
    typeof resourceTypeOrLocator === 'string'
      ? { resourceType: resourceTypeOrLocator, resourceId: resourceIdOrApprover }
      : resourceTypeOrLocator;
  const approverId = typeof resourceTypeOrLocator === 'string' ? Number(approverIdOrComment) : resourceIdOrApprover;
  const comment = String((typeof resourceTypeOrLocator === 'string' ? maybeComment : approverIdOrComment) ?? '').trim();

  const a = await findPending(loc);
  await assertChecker(a, approverId);
  const payload = readPayload(a);

  const outcome = await prisma.$transaction(async (tx) => {
    await claim(tx, a, 'APPROVED', approverId, comment);
    return applyApproved(tx, a, payload);
  });

  await audit(
    approverId,
    `approve_${a.resourceType}_${a.action}`,
    a.resourceType,
    outcome.resourceId ?? a.resourceId,
    outcome.before ?? null,
    outcome.after ?? { status: 'approved' },
    a.submitterId,
    approverId
  );
  await runAfterCommit(outcome);
  return prisma.approval.findUnique({ where: { id: a.id } });
}

export async function reject(
  resourceTypeOrLocator: string | Locator,
  resourceIdOrApprover: number,
  approverIdOrComment?: number | string,
  maybeComment?: string
) {
  const loc: Locator =
    typeof resourceTypeOrLocator === 'string'
      ? { resourceType: resourceTypeOrLocator, resourceId: resourceIdOrApprover }
      : resourceTypeOrLocator;
  const approverId = typeof resourceTypeOrLocator === 'string' ? Number(approverIdOrComment) : resourceIdOrApprover;
  const comment = String((typeof resourceTypeOrLocator === 'string' ? maybeComment : approverIdOrComment) ?? '').trim();

  if (!comment) throw new ApprovalError('Please give a reason for rejecting.');

  const a = await findPending(loc);
  await assertChecker(a, approverId);

  const outcome = await prisma.$transaction(async (tx) => {
    await claim(tx, a, 'REJECTED', approverId, comment);
    return applyRejected(tx, a, comment);
  });

  await audit(
    approverId,
    `reject_${a.resourceType}_${a.action}`,
    a.resourceType,
    a.resourceId,
    { status: 'SUBMITTED' },
    { status: 'REJECTED', reason: comment },
    a.submitterId,
    approverId
  );
  await runAfterCommit(outcome);
  return prisma.approval.findUnique({ where: { id: a.id } });
}

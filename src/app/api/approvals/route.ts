import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hydrateNoticeBodiesWithPeopleSnapshot } from '@/lib/noticePeopleSnapshot';
import { guardStaffOrAdmin } from '@/lib/auth';
import { readPayload } from '@/lib/approval';
import { storedFileUrl } from '@/lib/storedFiles';

function fmtDate(v: unknown) {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function GET() {
  const g = guardStaffOrAdmin();
  if ('response' in g) return g.response;
  const me = g.user;
  const list = await prisma.approval.findMany({ 
    orderBy: { createdAt: 'desc' }, 
    take: 200,
    include: {
      approver1: { select: { name: true, email: true } },
      approver2: { select: { name: true, email: true } }
    }
  });
  const submitterIds = [...new Set(list.map((a) => a.submitterId))];
  const submitters = await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, name: true, email: true } });
  const submitterById = new Map(submitters.map((s) => [s.id, s]));

  const noticeIds = [
    ...new Set(list.filter((a) => a.resourceType === 'notice').map((a) => a.resourceId))
  ];
  const noticesRaw =
    noticeIds.length > 0 ? await prisma.notice.findMany({ where: { id: { in: noticeIds } } }) : [];
  const noticesHydrated = await hydrateNoticeBodiesWithPeopleSnapshot(noticesRaw);
  const noticeById = new Map(noticesHydrated.map((n) => [n.id, n]));
  
  // Enrich with resource details based on resourceType
  const enrichedList = await Promise.all(list.map(async (approvalRow) => {
    const submitter = submitterById.get(approvalRow.submitterId);
    const approval = {
      ...approvalRow,
      submitter: submitter ? { name: submitter.name, email: submitter.email } : null,
      // Only a different admin may act; staff only view.
      canAct: approvalRow.status === 'SUBMITTED' && me.role === 'admin' && approvalRow.submitterId !== me.id,
      isMine: approvalRow.submitterId === me.id,
    };
    const payload = readPayload(approvalRow);
    if (approval.resourceType === 'booking') {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
      // Booking might be null if it was already deleted (for delete approvals that were approved)
      return {
        ...approval,
        bookingDetails: booking ? {
          bookingRef: booking.bookingRef,
          requesterName: booking.requesterName,
          email: booking.email,
          phone: booking.phone,
          hall: booking.hall,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          purpose: booking.purpose,
          status: booking.status,
          amount: booking.amount,
          paymentRef: booking.paymentRef,
          slipUrl: booking.slipFileId ? storedFileUrl(booking.slipFileId) : booking.slipUrl
        } : (approval.action === 'delete' ? {
          // For approved deletions, booking no longer exists, but we can show it was deleted
          bookingRef: 'Booking #' + approval.resourceId,
          deleted: true
        } : null)
      };
    }
    if (approval.resourceType === 'notice') {
      const notice = noticeById.get(approval.resourceId);
      // Notice might be null if it was already deleted (for delete approvals that were approved)
      return {
        ...approval,
        noticeDetails: notice ? {
          title: notice.title,
          bodyHtml: notice.bodyHtml,
          weekOf: notice.weekOf,
          status: notice.status
        } : (approval.action === 'delete' ? {
          // For approved deletions, notice no longer exists, but we can show it was deleted
          title: 'Notice #' + approval.resourceId,
          deleted: true
        } : null)
      };
    }
    if (approval.resourceType === 'sermon') {
      const sermon = await prisma.sermon.findUnique({ where: { id: approval.resourceId } });
      // Sermon might be null if it was already deleted (for delete approvals that were approved)
      return {
        ...approval,
        sermonDetails: sermon ? {
          title: sermon.title,
          speaker: sermon.speaker,
          link: sermon.link,
          date: sermon.date,
          status: sermon.status
        } : (approval.action === 'delete' ? {
          // For approved deletions, sermon no longer exists, but we can show it was deleted
          title: 'Sermon #' + approval.resourceId,
          deleted: true
        } : null)
      };
    }
    if (approval.resourceType === 'asset') {
      const asset = await prisma.asset.findUnique({ where: { id: approval.resourceId } });
      
      // For update requests, parse the proposed changes from comment1
      const proposedChanges: any = approval.action === 'update' ? payload : null;
      
      // Asset might be null if it was already deleted (for delete approvals that were approved)
      return {
        ...approval,
        assetDetails: asset ? {
          reference: asset.reference,
          value: asset.value,
          quantity: asset.quantity,
          labelCategory: asset.labelCategory,
          notes: asset.notes,
          status: asset.status,
          proposedChanges: proposedChanges // Include proposed changes for update requests
        } : (approval.action === 'delete' ? {
          // For approved deletions, asset no longer exists, but we can show it was deleted
          reference: 'Asset #' + approval.resourceId,
          deleted: true
        } : null)
      };
    }
    if (approval.resourceType === 'church_bank_account') {
      const proposal = await prisma.churchBankAccountProposal.findUnique({
        where: { id: approval.resourceId }
      });
      return {
        ...approval,
        churchBankAccountDetails: proposal
          ? {
              accountNumber: proposal.accountNumber,
              accountName: proposal.accountName,
              bankName: proposal.bankName,
              branch: proposal.branch,
              proposalStatus: proposal.status
            }
          : null
      };
    }
    if (approval.resourceType === 'process') {
      const process = await prisma.processDoc.findUnique({ where: { id: approval.resourceId } });

      // For update requests, parse the proposed changes from comment1
      const proposedChanges: any = approval.action === 'update' ? payload : null;

      let attachmentsToRemove: { id: number; fileName: string }[] = [];
      const rmIds = proposedChanges?.removeAttachmentIds;
      if (
        process &&
        Array.isArray(rmIds) &&
        rmIds.length > 0 &&
        approval.action === 'update' &&
        approval.status === 'SUBMITTED'
      ) {
        const ids = [...new Set(rmIds.map((x: unknown) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
        if (ids.length) {
          attachmentsToRemove = await prisma.processAttachment.findMany({
            where: { processDocId: approval.resourceId, id: { in: ids } },
            select: { id: true, fileName: true },
          });
        }
      }

      // Process might be null if it was already deleted (for delete approvals that were approved)
      return {
        ...approval,
        processDetails: process
          ? {
              title: process.title,
              contentHtml: process.contentHtml,
              audience: process.audience,
              version: process.version,
              status: process.status,
              proposedChanges: proposedChanges,
              attachmentsToRemove,
            }
          : approval.action === 'delete'
            ? {
                title: 'Process #' + approval.resourceId,
                deleted: true,
              }
            : null,
      };
    }
    if (approval.resourceType === 'individual') {
      const current = approval.resourceId ? await prisma.churchIndividual.findUnique({ where: { id: approval.resourceId } }) : null;
      const p = payload || {};
      const rows: [string, string][] = [];
      const name = p.displayName ?? current?.displayName ?? '—';
      rows.push(['Name', String(name)]);
      if (p.birthDate !== undefined) rows.push(['Date of birth', fmtDate(p.birthDate)]);
      if (p.dateOfDeath !== undefined) rows.push(['Date of death', p.dateOfDeath ? fmtDate(p.dateOfDeath) : '(cleared)']);
      if (p.status !== undefined) rows.push(['Status', p.status === 'inactive' ? 'Inactive (deceased)' : 'Active']);
      if (p.email !== undefined) rows.push(['Email', p.email || '—']);
      if (p.phone !== undefined) rows.push(['Phone', p.phone || '—']);
      if (p.notes !== undefined) rows.push(['Notes', p.notes || '—']);
      return {
        ...approval,
        genericDetails: {
          heading: approval.action === 'create' ? 'Add a person to the register' : `Change details for ${current?.displayName ?? 'person'}`,
          rows,
        },
      };
    }
    if (approval.resourceType === 'anniversary') {
      const p = payload || {};
      const current = approval.resourceId
        ? await prisma.weddingAnniversary.findUnique({ where: { id: approval.resourceId }, include: { individualA: true, individualB: true } })
        : null;
      const ids = [p.individualAId, p.individualBId].filter(Boolean).map(Number);
      const people = ids.length ? await prisma.churchIndividual.findMany({ where: { id: { in: ids } } }) : [];
      const nameOf = (id: unknown, fallback?: string) => people.find((x) => x.id === Number(id))?.displayName ?? fallback ?? '—';
      const rows: [string, string][] = [
        ['Couple', `${nameOf(p.individualAId, current?.individualA.displayName)} & ${nameOf(p.individualBId, current?.individualB.displayName)}`],
      ];
      if (p.anniversaryDate !== undefined) rows.push(['Wedding date', fmtDate(p.anniversaryDate)]);
      if (p.status !== undefined) rows.push(['Status', p.status]);
      if (p.notes !== undefined) rows.push(['Notes', p.notes || '—']);
      return {
        ...approval,
        genericDetails: { heading: approval.action === 'create' ? 'Add a wedding anniversary' : 'Change a wedding anniversary', rows },
      };
    }
    if (approval.resourceType === 'hall_settings') {
      const current = await prisma.hallBookingSettings.findUnique({ where: { id: 1 } });
      return {
        ...approval,
        genericDetails: {
          heading: 'Change the hall hire rate',
          rows: [
            ['Current rate (per 30 minutes)', `LKR ${(current?.ratePer30Minutes ?? 0).toLocaleString()}`],
            ['New rate (per 30 minutes)', `LKR ${Number(payload?.ratePer30Minutes ?? 0).toLocaleString()}`],
          ],
        },
      };
    }
    return approval;
  }));
  
  return NextResponse.json({ list: enrichedList });
}

export const dynamic = 'force-dynamic';

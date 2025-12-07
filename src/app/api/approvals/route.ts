import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const list = await prisma.approval.findMany({ 
    orderBy: { createdAt: 'desc' }, 
    take: 50,
    include: {
      approver1: { select: { name: true, email: true } },
      approver2: { select: { name: true, email: true } }
    }
  });
  
  // Enrich with resource details based on resourceType
  const enrichedList = await Promise.all(list.map(async (approval) => {
    if (approval.resourceType === 'booking') {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
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
          purpose: booking.purpose
        } : null
      };
    }
    if (approval.resourceType === 'notice') {
      const notice = await prisma.notice.findUnique({ where: { id: approval.resourceId } });
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
      let proposedChanges: any = null;
      if (approval.action === 'update' && approval.status === 'SUBMITTED' && approval.comment1) {
        try {
          proposedChanges = JSON.parse(approval.comment1);
        } catch (e) {
          // If parsing fails, comment1 might already contain approver comment
        }
      }
      
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
    return approval;
  }));
  
  return NextResponse.json({ list: enrichedList });
}

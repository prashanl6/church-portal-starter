import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { audit } from './audit';

// Get or create a system user for guest submissions (like bookings)
export async function getOrCreateSystemUser() {
  const systemEmail = 'system@church.local';
  let systemUser = await prisma.user.findUnique({ where: { email: systemEmail } });
  if (!systemUser) {
    const hash = await bcrypt.hash('system', 10);
    systemUser = await prisma.user.create({
      data: {
        name: 'System User',
        email: systemEmail,
        passwordHash: hash,
        role: 'guest',
        status: 'active'
      }
    });
  }
  return systemUser;
}

export async function submitApproval(resourceType: string, resourceId: number, action: string, submitterId: number) {
  return prisma.approval.create({
    data: { resourceType, resourceId, action, submitterId, status: 'SUBMITTED' }
  });
}

export async function approve(resourceType: string, resourceId: number, approverId: number, comment: string) {
  const approval = await prisma.approval.findFirst({ where: { resourceType, resourceId, status: 'SUBMITTED' } });
  if (!approval) throw new Error('No pending approval');
  if (!approval.approver1Id) {
    if (approval.submitterId === approverId) throw new Error('Submitter cannot approve');
    
    // For notices, sermons, and assets, single approval is sufficient - approve immediately
    if (approval.action === 'publish') {
      if (approval.resourceType === 'notice') {
        const updated = await prisma.approval.update({ 
          where: { id: approval.id }, 
          data: { 
            approver1Id: approverId, 
            comment1: comment,
            status: 'APPROVED' 
          } 
        });
        await prisma.notice.update({
          where: { id: approval.resourceId },
          data: { status: 'published' }
        });
        
        // Audit log with requestor and approver
        await audit(approverId, 'approve_notice', 'notice', approval.resourceId, 
          { status: 'draft' }, 
          { status: 'published' },
          approval.submitterId,
          approverId
        );
        
        return updated;
      }
      
      if (approval.resourceType === 'sermon') {
        const updated = await prisma.approval.update({ 
          where: { id: approval.id }, 
          data: { 
            approver1Id: approverId, 
            comment1: comment,
            status: 'APPROVED' 
          } 
        });
        
        await prisma.sermon.update({
          where: { id: approval.resourceId },
          data: { status: 'published' }
        });

        // Audit log with requestor and approver
        await audit(approverId, 'approve_sermon', 'sermon', approval.resourceId,
          { status: 'draft' },
          { status: 'published' },
          approval.submitterId,
          approverId
        );
        
        return updated;
      }
    }
    
    // For assets (action: 'create'), single approval is sufficient
    if (approval.resourceType === 'asset' && approval.action === 'create') {
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      // Assets are already created with status 'active', so no status change needed
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_asset_create', 'asset', approval.resourceId,
        null,
        { action: 'create', status: 'approved' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For asset updates, parse the update data from comment1 and update the original asset
    if (approval.resourceType === 'asset' && approval.action === 'update') {
      let updateData: any = {};
      try {
        // Parse the update data stored in comment1
        if (approval.comment1) {
          updateData = JSON.parse(approval.comment1);
        }
      } catch (e) {
        throw new Error('Invalid update data in approval');
      }
      
      const asset = await prisma.asset.findUnique({ where: { id: approval.resourceId } });
      if (!asset) {
        throw new Error('Asset not found');
      }
      
      // Update the original asset with the new data
      await prisma.asset.update({
        where: { id: approval.resourceId },
        data: {
          reference: updateData.reference,
          value: updateData.value,
          quantity: updateData.quantity,
          labelCategory: updateData.labelCategory,
          notes: updateData.notes
        }
      });
      
      // Update approval with approver comment (replacing the JSON data)
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment || 'Approved', // Replace JSON with approver's comment
          status: 'APPROVED' 
        } 
      });
      
      return updated;
    }
    
    // For asset deletions, single approval is sufficient - delete the asset when approved
    if (approval.resourceType === 'asset' && approval.action === 'delete') {
      const asset = await prisma.asset.findUnique({ where: { id: approval.resourceId } });
      if (!asset) {
        throw new Error('Asset not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      // Delete the asset after approval
      await prisma.asset.delete({ where: { id: approval.resourceId } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_asset_delete', 'asset', approval.resourceId,
        asset,
        { action: 'delete', status: 'deleted' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For notice deletions, single approval is sufficient - delete the notice when approved
    if (approval.resourceType === 'notice' && approval.action === 'delete') {
      const notice = await prisma.notice.findUnique({ where: { id: approval.resourceId } });
      if (!notice) {
        throw new Error('Notice not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      // Delete the notice after approval
      await prisma.notice.delete({ where: { id: approval.resourceId } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_notice_delete', 'notice', approval.resourceId,
        notice,
        { action: 'delete', status: 'deleted' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For sermon deletions, single approval is sufficient - delete the sermon when approved
    if (approval.resourceType === 'sermon' && approval.action === 'delete') {
      const sermon = await prisma.sermon.findUnique({ where: { id: approval.resourceId } });
      if (!sermon) {
        throw new Error('Sermon not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      // Delete the sermon after approval
      await prisma.sermon.delete({ where: { id: approval.resourceId } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_sermon_delete', 'sermon', approval.resourceId,
        sermon,
        { action: 'delete', status: 'deleted' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For process documents (action: 'publish'), single approval is sufficient - publish immediately
    if (approval.resourceType === 'process' && approval.action === 'publish') {
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      await prisma.processDoc.update({ where: { id: approval.resourceId }, data: { status: 'published' } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_process_create', 'process', approval.resourceId,
        { status: 'submitted' },
        { status: 'published' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For process updates, parse the update data from comment1 and update the original process
    if (approval.resourceType === 'process' && approval.action === 'update') {
      let updateData: any = {};
      try {
        // Parse the update data stored in comment1
        if (approval.comment1) {
          updateData = JSON.parse(approval.comment1);
        }
      } catch (e) {
        throw new Error('Invalid update data in approval');
      }
      
      const process = await prisma.processDoc.findUnique({ where: { id: approval.resourceId } });
      if (!process) {
        throw new Error('Process not found');
      }
      
      // Update the original process with the new data
      const nextAudience =
        updateData.audience === 'public' || updateData.audience === 'steward'
          ? updateData.audience
          : process.audience;

      await prisma.processDoc.update({
        where: { id: approval.resourceId },
        data: {
          title: updateData.title,
          contentHtml: updateData.contentHtml,
          audience: nextAudience,
          version: process.version + 1,
        },
      });

      const removeIds = Array.isArray(updateData.removeAttachmentIds)
        ? updateData.removeAttachmentIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      if (removeIds.length) {
        const { deleteProcessAttachmentsByIds } = await import('@/lib/processAttachmentFs');
        await deleteProcessAttachmentsByIds(approval.resourceId, removeIds);
      }

      // Update approval with approver comment (replacing the JSON data)
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment || 'Approved', // Replace JSON with approver's comment
          status: 'APPROVED' 
        } 
      });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_asset_update', 'asset', approval.resourceId,
        updateData,
        { action: 'update', status: 'approved' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For process deletions, single approval is sufficient - delete the process when approved
    if (approval.resourceType === 'process' && approval.action === 'delete') {
      const process = await prisma.processDoc.findUnique({ where: { id: approval.resourceId } });
      if (!process) {
        throw new Error('Process not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      const { unlinkProcessAttachmentFiles } = await import('@/lib/processAttachmentFs');
      await unlinkProcessAttachmentFiles(approval.resourceId);
      // Delete the process after approval (attachments cascade in DB)
      await prisma.processDoc.delete({ where: { id: approval.resourceId } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_process_delete', 'process', approval.resourceId,
        process,
        { action: 'delete', status: 'deleted' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }
    
    // For booking payment confirmations (action: 'confirm_payment'), single approval is sufficient
    if (approval.resourceType === 'booking' && approval.action === 'confirm_payment') {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (!booking.slipUrl) {
        throw new Error('No payment receipt uploaded');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      // Update booking status to BOOKED_PAID
      await prisma.booking.update({ 
        where: { id: approval.resourceId }, 
        data: { status: 'BOOKED_PAID' } 
      });
      
      // Send payment confirmation email to requester
      try {
        const { sendBookingPaymentConfirmedEmail } = await import('@/lib/email');
        await sendBookingPaymentConfirmedEmail({
          bookingRef: booking.bookingRef,
          requesterName: booking.requesterName,
          email: booking.email,
          phone: booking.phone,
          hall: booking.hall,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          purpose: booking.purpose,
          amount: booking.amount || undefined,
          paymentRef: booking.paymentRef || undefined,
        });
      } catch (emailError: any) {
        console.error('Error sending payment confirmation email:', emailError);
        // Don't fail the approval if email fails
      }
      
      return updated;
    }
    
    // For bookings (action: 'approve'), single approval is sufficient
    if (approval.resourceType === 'booking' && approval.action === 'approve') {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      await prisma.booking.update({ where: { id: approval.resourceId }, data: { status: 'APPROVED_PENDING_PAYMENT' } });
      
      // Send approval email to requester
      try {
        const { sendBookingApprovalEmail } = await import('@/lib/email');
        // Get base URL, ensuring it's a clean URL without the variable name
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';
        // Remove any trailing slashes and ensure it's a proper URL
        baseUrl = baseUrl.trim().replace(/\/$/, '');
        // If it somehow contains the variable name, extract just the URL part
        if (baseUrl.includes('BASE_URL=')) {
          baseUrl = baseUrl.split('BASE_URL=')[1] || 'http://localhost:3001';
        }
        await sendBookingApprovalEmail(
          {
            bookingRef: booking.bookingRef,
            requesterName: booking.requesterName,
            email: booking.email,
            phone: booking.phone,
            hall: booking.hall,
            date: booking.date.toISOString(),
            startTime: booking.startTime,
            endTime: booking.endTime,
            purpose: booking.purpose,
            amount: booking.amount || undefined
          },
          baseUrl
        );
      } catch (emailError: any) {
        console.error('Error sending booking approval email:', emailError);
        // Don't fail the approval if email fails
      }
      
      return updated;
    }
    
    // For booking deletions, single approval is sufficient - delete the booking when approved
    if (approval.resourceType === 'booking' && approval.action === 'delete') {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      
      // Delete the booking after approval
      await prisma.booking.delete({ where: { id: approval.resourceId } });
      
      // Audit log with requestor and approver
      await audit(approverId, 'approve_booking_delete', 'booking', approval.resourceId,
        booking,
        { action: 'delete', status: 'deleted' },
        approval.submitterId,
        approverId
      );
      
      return updated;
    }

    // Church bank account updates: single approval — publish live row and mark proposal approved
    if (approval.resourceType === 'church_bank_account' && approval.action === 'update') {
      const proposal = await prisma.churchBankAccountProposal.findUnique({
        where: { id: approval.resourceId }
      });
      if (!proposal) throw new Error('Bank account proposal not found');
      if (proposal.status !== 'PENDING') throw new Error('This proposal is no longer pending');
      await prisma.churchBankAccount.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          accountNumber: proposal.accountNumber,
          accountName: proposal.accountName,
          bankName: proposal.bankName,
          branch: proposal.branch
        },
        update: {
          accountNumber: proposal.accountNumber,
          accountName: proposal.accountName,
          bankName: proposal.bankName,
          branch: proposal.branch
        }
      });
      await prisma.churchBankAccountProposal.update({
        where: { id: proposal.id },
        data: { status: 'APPROVED' }
      });
      return prisma.approval.update({
        where: { id: approval.id },
        data: {
          approver1Id: approverId,
          comment1: comment,
          status: 'APPROVED'
        }
      });
    }

    // For any other resource types, still require dual approval (fallback)
    return prisma.approval.update({ where: { id: approval.id }, data: { approver1Id: approverId, comment1: comment } });
  }
  if (!approval.approver2Id) {
    if (approval.submitterId === approverId || approval.approver1Id === approverId) throw new Error('Approver must be distinct');
    const updated = await prisma.approval.update({ where: { id: approval.id }, data: { approver2Id: approverId, comment2: comment, status: 'APPROVED' } });

    if (approval.resourceType === 'church_bank_account') {
      const proposal = await prisma.churchBankAccountProposal.findUnique({
        where: { id: approval.resourceId }
      });
      if (!proposal) throw new Error('Bank account proposal not found');
      if (proposal.status !== 'PENDING') throw new Error('This proposal is no longer pending');
      await prisma.churchBankAccount.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          accountNumber: proposal.accountNumber,
          accountName: proposal.accountName,
          bankName: proposal.bankName,
          branch: proposal.branch
        },
        update: {
          accountNumber: proposal.accountNumber,
          accountName: proposal.accountName,
          bankName: proposal.bankName,
          branch: proposal.branch
        }
      });
      await prisma.churchBankAccountProposal.update({
        where: { id: proposal.id },
        data: { status: 'APPROVED' }
      });
    }

    return updated;
  }
  return approval;
}

export async function reject(resourceType: string, resourceId: number, approverId: number, comment: string) {
  const approval = await prisma.approval.findFirst({ where: { resourceType, resourceId, status: 'SUBMITTED' } });
  if (!approval) throw new Error('No pending approval');
  
  // For bookings, comment is mandatory
  if (approval.resourceType === 'booking' && (!comment || comment.trim() === '')) {
    throw new Error('Rejection reason is required for booking rejections');
  }
  
  const updated = await prisma.approval.update({ 
    where: { id: approval.id }, 
    data: { 
      status: 'REJECTED', 
      approver1Id: approverId,
      comment1: comment 
    } 
  });

  if (approval.resourceType === 'church_bank_account') {
    await prisma.churchBankAccountProposal.updateMany({
      where: { id: approval.resourceId, status: 'PENDING' },
      data: { status: 'REJECTED' }
    });
  }
  
  // Audit log with requestor and approver for rejection
  await audit(approverId, `reject_${approval.resourceType}`, approval.resourceType, approval.resourceId,
    { status: 'SUBMITTED' },
    { status: 'REJECTED', comment },
    approval.submitterId,
    approverId
  );
  
  // Update booking status to REJECTED
  if (approval.resourceType === 'booking') {
    await prisma.booking.update({ 
      where: { id: approval.resourceId }, 
      data: { status: 'REJECTED' } 
    });
    
    // Send rejection email to requester
    try {
      const booking = await prisma.booking.findUnique({ where: { id: approval.resourceId } });
      if (booking) {
        const { sendBookingRejectionEmail } = await import('@/lib/email');
        await sendBookingRejectionEmail({
          bookingRef: booking.bookingRef,
          requesterName: booking.requesterName,
          email: booking.email,
          phone: booking.phone,
          hall: booking.hall,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          purpose: booking.purpose,
        }, comment);
      }
    } catch (emailError: any) {
      console.error('Error sending booking rejection email:', emailError);
      // Don't fail the rejection if email fails
    }
  }
  
  return updated;
}

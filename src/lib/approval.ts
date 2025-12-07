import { prisma } from './prisma';
import { fetchFacebookViews } from './facebook';
import bcrypt from 'bcryptjs';

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
        await prisma.notice.update({ where: { id: approval.resourceId }, data: { status: 'published' } });
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
        
        // Try to fetch views from Facebook link when publishing
        const sermon = await prisma.sermon.findUnique({ where: { id: approval.resourceId } });
        let viewsUpdate: number | undefined = undefined;
        if (sermon && sermon.link) {
          try {
            const fetched = await fetchFacebookViews(sermon.link);
            if (typeof fetched === 'number') viewsUpdate = fetched;
          } catch (e) {
            // ignore facebook fetch errors
          }
        }
        await prisma.sermon.update({ 
          where: { id: approval.resourceId }, 
          data: { 
            status: 'published', 
            ...(viewsUpdate !== undefined ? { views: viewsUpdate } : {}) 
          } 
        });
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
      
      return updated;
    }
    
    // For bookings (action: 'approve'), single approval is sufficient
    if (approval.resourceType === 'booking' && approval.action === 'approve') {
      const updated = await prisma.approval.update({ 
        where: { id: approval.id }, 
        data: { 
          approver1Id: approverId, 
          comment1: comment,
          status: 'APPROVED' 
        } 
      });
      await prisma.booking.update({ where: { id: approval.resourceId }, data: { status: 'APPROVED_PENDING_PAYMENT' } });
      return updated;
    }
    
    // For any other resource types, still require dual approval (fallback)
    return prisma.approval.update({ where: { id: approval.id }, data: { approver1Id: approverId, comment1: comment } });
  }
  if (!approval.approver2Id) {
    if (approval.submitterId === approverId || approval.approver1Id === approverId) throw new Error('Approver must be distinct');
    const updated = await prisma.approval.update({ where: { id: approval.id }, data: { approver2Id: approverId, comment2: comment, status: 'APPROVED' } });
    
    // This section is only reached for resources that still require dual approval
    // (Currently, all resources use single approval, so this is a fallback for future resources)
    
    return updated;
  }
  return approval;
}

export async function reject(resourceType: string, resourceId: number, approverId: number, comment: string) {
  const approval = await prisma.approval.findFirst({ where: { resourceType, resourceId, status: 'SUBMITTED' } });
  if (!approval) throw new Error('No pending approval');
  return prisma.approval.update({ where: { id: approval.id }, data: { status: 'REJECTED', comment2: comment } });
}

import { prisma } from './prisma';

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
    return prisma.approval.update({ where: { id: approval.id }, data: { approver1Id: approverId, comment1: comment } });
  }
  if (!approval.approver2Id) {
    if (approval.submitterId === approverId || approval.approver1Id === approverId) throw new Error('Approver must be distinct');
    const updated = await prisma.approval.update({ where: { id: approval.id }, data: { approver2Id: approverId, comment2: comment, status: 'APPROVED' } });
    
    // Publish the resource when approval is complete
    if (approval.action === 'publish') {
      if (approval.resourceType === 'notice') {
        await prisma.notice.update({ where: { id: approval.resourceId }, data: { status: 'published' } });
      }
    }
    
    return updated;
  }
  return approval;
}

export async function reject(resourceType: string, resourceId: number, approverId: number, comment: string) {
  const approval = await prisma.approval.findFirst({ where: { resourceType, resourceId, status: 'SUBMITTED' } });
  if (!approval) throw new Error('No pending approval');
  return prisma.approval.update({ where: { id: approval.id }, data: { status: 'REJECTED', comment2: comment } });
}

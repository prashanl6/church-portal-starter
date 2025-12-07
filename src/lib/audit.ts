import { prisma } from './prisma';
import { headers } from 'next/headers';

export async function audit(
  actorId: number, 
  action: string, 
  resourceType: string, 
  resourceId: number, 
  beforeJson?: any, 
  afterJson?: any,
  requestorId?: number,
  approverId?: number
) {
  const h = headers();
  
  // Enhance afterJson with requestor and approver information
  let enhancedAfterJson = afterJson || {};
  if (requestorId || approverId) {
    enhancedAfterJson = {
      ...enhancedAfterJson,
      ...(requestorId ? { requestorId } : {}),
      ...(approverId ? { approverId } : {})
    };
  }
  
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      resourceType,
      resourceId,
      beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
      afterJson: Object.keys(enhancedAfterJson).length > 0 ? JSON.stringify(enhancedAfterJson) : null,
    }
  });
}

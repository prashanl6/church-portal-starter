import { prisma } from './prisma';
import { headers } from 'next/headers';

export async function audit(actorId: number, action: string, resourceType: string, resourceId: number, beforeJson?: any, afterJson?: any) {
  const h = headers();
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      resourceType,
      resourceId,
      beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
      afterJson: afterJson ? JSON.stringify(afterJson) : null,
    }
  });
}

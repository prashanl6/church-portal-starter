import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const u = requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    const list = await prisma.auditLog.findMany({ 
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    
    // Enrich with actor, requestor and approver information
    const enrichedList = await Promise.all(list.map(async (log) => {
      // Fetch actor user
      const actor = await prisma.user.findUnique({
        where: { id: log.actorId },
        select: { id: true, name: true, email: true }
      });
      
      let requestor = null;
      let approver = null;
      
      if (log.afterJson) {
        try {
          const afterData = JSON.parse(log.afterJson);
          if (afterData.requestorId) {
            const requestorUser = await prisma.user.findUnique({
              where: { id: afterData.requestorId },
              select: { id: true, name: true, email: true }
            });
            requestor = requestorUser;
          }
          if (afterData.approverId) {
            const approverUser = await prisma.user.findUnique({
              where: { id: afterData.approverId },
              select: { id: true, name: true, email: true }
            });
            approver = approverUser;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      return {
        ...log,
        actor,
        requestor,
        approver
      };
    }));
    
    return NextResponse.json({ list: enrichedList });
  } catch (error: any) {
    console.error('Error in GET /api/admin/audit:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs', list: [] }, { status: 500 });
  }
}


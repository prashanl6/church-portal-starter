import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  const u = getUserFromCookie();
  if (!u) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
  
  if (u.role !== 'admin') {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
  
  try {
    const count = await prisma.approval.count({
      where: {
        status: 'SUBMITTED'
      }
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching pending approvals count:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}


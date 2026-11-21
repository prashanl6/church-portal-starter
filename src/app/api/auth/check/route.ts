import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = getUserFromCookie();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  // Fetch user details from database to get name
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, role: true, status: true }
  });
  // A switched-off account counts as logged out.
  if (!userDetails || userDetails.status !== 'active') {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ 
    authenticated: true, 
    role: user.role,
    email: user.email,
    name: userDetails?.name || user.email.split('@')[0]
  });
}


export const dynamic = 'force-dynamic';

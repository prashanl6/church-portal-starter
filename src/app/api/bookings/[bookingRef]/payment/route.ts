import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { submitApproval, getOrCreateSystemUser } from '@/lib/approval';

export async function POST(req: Request, { params }: { params: { bookingRef: string } }) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingRef: params.bookingRef },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'APPROVED_PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Booking is not in a state to accept payment' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentRef = formData.get('paymentRef') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!paymentRef || !paymentRef.trim()) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images (JPG, PNG) and PDF are allowed' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'receipts');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${booking.bookingRef}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update booking with payment details
    const slipUrl = `/uploads/receipts/${fileName}`;
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentRef: paymentRef.trim(),
        slipUrl,
        status: 'APPROVED_PENDING_PAYMENT', // Still pending admin confirmation
      },
    });

    // Create approval record for payment confirmation
    try {
      const systemUser = await getOrCreateSystemUser();
      // Check if there's already a pending payment approval
      const existingApproval = await prisma.approval.findFirst({
        where: {
          resourceType: 'booking',
          resourceId: booking.id,
          action: 'confirm_payment',
          status: 'SUBMITTED'
        }
      });
      
      if (!existingApproval) {
        await submitApproval('booking', booking.id, 'confirm_payment', systemUser.id);
      }
    } catch (approvalError: any) {
      console.error('Error creating payment approval:', approvalError);
      // Don't fail the upload if approval creation fails
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Receipt uploaded successfully. Waiting for admin confirmation.',
      slipUrl 
    });
  } catch (error: any) {
    console.error('Error uploading payment receipt:', error);
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
  }
}


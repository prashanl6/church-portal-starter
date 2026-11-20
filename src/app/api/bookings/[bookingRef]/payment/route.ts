import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { saveStoredFile, deleteStoredFiles } from '@/lib/storedFiles';
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

    // Validate file size (max 4 MB)
    const maxSize = 4 * 1024 * 1024; // Vercel rejects bodies over 4.5 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'This file is too large. Please upload a photo or PDF under 4 MB.' }, { status: 400 });
    }

    // Check the file really is an image/PDF by its first bytes, not just what the browser says.
    const head = Buffer.from(await file.slice(0, 8).arrayBuffer());
    const isPdf = head.subarray(0, 4).toString('latin1') === '%PDF';
    const isPng = head[0] === 0x89 && head.subarray(1, 4).toString('latin1') === 'PNG';
    const isJpg = head[0] === 0xff && head[1] === 0xd8;
    if (!isPdf && !isPng && !isJpg) {
      return NextResponse.json({ error: 'Please upload a photo (JPG or PNG) or a PDF of the payment slip.' }, { status: 400 });
    }
    const mimeType = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg';
    const ext = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';

    // Stored in the database (not on the web server's disk, which is wiped on Vercel and was public).
    const saved = await saveStoredFile('booking_slip', file, `${booking.bookingRef}-payment-slip.${ext}`, mimeType);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentRef: paymentRef.trim().slice(0, 100),
        slipFileId: saved.id,
        slipUrl: null,
        status: 'APPROVED_PENDING_PAYMENT', // Still pending admin confirmation
      },
    });
    // Replace an earlier slip for this booking, if any.
    if (booking.slipFileId) await deleteStoredFiles([booking.slipFileId]);

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
    });
  } catch (error: any) {
    console.error('Error uploading payment receipt:', error);
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

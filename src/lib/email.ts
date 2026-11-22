import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

// Email configuration - using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || '';

/** True when an email account is configured. Without one, emails are skipped quickly instead of timing out. */
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function send(message: Parameters<typeof transporter.sendMail>[0]) {
  if (!emailConfigured()) {
    console.warn(`Email not sent (SMTP_USER/SMTP_PASS not set): ${message.subject}`);
    return;
  }
  await transporter.sendMail(message);
}
const FROM_NAME = process.env.FROM_NAME || 'Church Portal';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Visitor-typed text must never be able to add HTML or links to an email. */
function safeBooking(b: BookingDetails): BookingDetails {
  return { ...b, requesterName: escapeHtml(b.requesterName), hall: escapeHtml(b.hall), purpose: escapeHtml(b.purpose), phone: escapeHtml(b.phone), paymentRef: b.paymentRef ? escapeHtml(b.paymentRef) : b.paymentRef };
}

export interface BookingDetails {
  bookingRef: string;
  requesterName: string;
  email: string;
  phone: string;
  hall: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  amount?: number;
  paymentRef?: string;
}

export async function sendBookingSubmissionEmail(bookingIn: BookingDetails) {
  const booking = safeBooking(bookingIn);
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #2563eb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Request Submitted</h1>
        </div>
        <div class="content">
          <p>Dear ${booking.requesterName},</p>
          <p>Thank you for your hall booking request. Your request has been successfully submitted and is now pending approval.</p>
          
          <div class="details">
            <h3>Booking Details:</h3>
            <p><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
            <p><strong>Hall:</strong> ${booking.hall}</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            ${booking.amount != null && booking.amount > 0 ? `<p><strong>Estimated hall hire (pending approval):</strong> LKR ${booking.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
          </div>
          
          <p>You will receive an email notification once your booking request has been reviewed by an administrator.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Booking Request Submitted - ${booking.bookingRef}`,
      html,
    });
    // Tell the church office a request is waiting (set CHURCH_OFFICE_EMAIL; otherwise the Admin badge is the only sign).
    const office = process.env.CHURCH_OFFICE_EMAIL?.trim();
    if (office) {
      await send({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: office,
        subject: `New hall booking request - ${booking.bookingRef}`,
        html: `<p>A new hall booking request is waiting for approval.</p><p><strong>${booking.requesterName}</strong> (${booking.phone})<br>${booking.hall}, ${bookingDate}, ${booking.startTime} - ${booking.endTime}<br>${booking.purpose}</p><p>Open the website, then Admin, then Approvals.</p>`,
      });
    }
    return true;
  } catch (error) {
    console.error('Error sending booking submission email:', error);
    return false;
  }
}

export async function sendBookingApprovalEmail(bookingIn: BookingDetails, baseUrl: string = 'http://localhost:3001') {
  const booking = safeBooking(bookingIn);
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Ensure baseUrl doesn't have trailing slash and construct the link properly
  const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  const bookingLink = `${cleanBaseUrl}/booking/${booking.bookingRef}`;

  const bankRow = await prisma.churchBankAccount.findUnique({ where: { id: 1 } }).catch(() => null);
  const bankSection =
    bankRow && bankRow.accountNumber?.trim()
      ? `
          <div class="details" style="border-left-color: #2563eb;">
            <h3>Payment — Church Bank Account Details</h3>
            <p><strong>Account number:</strong> ${escapeHtml(bankRow.accountNumber)}</p>
            <p><strong>Account name:</strong> ${escapeHtml(bankRow.accountName)}</p>
            <p><strong>Bank:</strong> ${escapeHtml(bankRow.bankName)}</p>
            <p><strong>Branch:</strong> ${escapeHtml(bankRow.branch)}</p>
            <p style="font-size: 13px; color: #4b5563;">Please use this account when paying the amount above and include your booking reference in the transfer description if possible.</p>
          </div>`
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #10b981; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Approved ✓</h1>
        </div>
        <div class="content">
          <p>Dear ${booking.requesterName},</p>
          <p>Great news! Your hall booking request has been <strong>approved</strong>.</p>
          
          <div class="details">
            <h3>Booking Details:</h3>
            <p><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
            <p><strong>Hall:</strong> ${booking.hall}</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            ${booking.amount ? `<p class="amount">Amount to Pay: LKR ${booking.amount.toLocaleString()}</p>` : ''}
          </div>
          ${bankSection}
          
          <p>Please complete your payment and upload the receipt using the link below:</p>
          <a href="${bookingLink}" class="button">View Booking & Upload Receipt</a>
          
          <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${bookingLink}</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Booking Approved - ${booking.bookingRef}`,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending booking approval email:', error);
    return false;
  }
}

export async function sendBookingRejectionEmail(bookingIn: BookingDetails, rejectReason: string) {
  const booking = safeBooking(bookingIn);
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #ef4444; }
        .reject-reason { background: #fef2f2; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #ef4444; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Request Rejected</h1>
        </div>
        <div class="content">
          <p>Dear ${booking.requesterName},</p>
          <p>We regret to inform you that your hall booking request has been <strong>rejected</strong>.</p>
          
          <div class="details">
            <h3>Booking Details:</h3>
            <p><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
            <p><strong>Hall:</strong> ${booking.hall}</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
          </div>
          
          <div class="reject-reason">
            <h3>Reason for Rejection:</h3>
            <p>${escapeHtml(rejectReason)}</p>
          </div>
          
          <p>If you have any questions or would like to discuss this further, please contact us.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Booking Request Rejected - ${booking.bookingRef}`,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending booking rejection email:', error);
    return false;
  }
}

export async function sendBookingPaymentConfirmedEmail(bookingIn: BookingDetails) {
  const booking = safeBooking(bookingIn);
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #10b981; }
        .status-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed & Fully Paid ✓</h1>
        </div>
        <div class="content">
          <p>Dear ${booking.requesterName},</p>
          <p>Your payment receipt has been confirmed. Your booking is now <span class="status-badge">FULLY PAID</span> and confirmed.</p>
          
          <div class="details">
            <h3>Booking Details:</h3>
            <p><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
            <p><strong>Hall:</strong> ${booking.hall}</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Purpose:</strong> ${booking.purpose}</p>
            ${booking.amount ? `<p><strong>Amount Paid:</strong> LKR ${booking.amount.toLocaleString()}</p>` : ''}
            ${booking.paymentRef ? `<p><strong>Payment Reference:</strong> ${booking.paymentRef}</p>` : ''}
          </div>
          
          <p>Your booking is confirmed and ready. We look forward to hosting your event!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Booking Confirmed - ${booking.bookingRef}`,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return false;
  }
}

export async function sendBookingAutoCancelledEmail(bookingIn: BookingDetails) {
  const booking = safeBooking(bookingIn);
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #b45309, #92400e); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #b45309; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking automatically cancelled</h1>
        </div>
        <div class="content">
          <p>Dear ${escapeHtml(booking.requesterName)},</p>
          <p>Your hall booking was <strong>automatically cancelled</strong> because payment was not fully confirmed
          (receipt approved by the church) <strong>at least one hour before</strong> the scheduled start time.</p>

          <div class="details">
            <h3>Cancelled booking</h3>
            <p><strong>Booking Reference:</strong> ${escapeHtml(booking.bookingRef)}</p>
            <p><strong>Hall:</strong> ${escapeHtml(booking.hall)}</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${escapeHtml(booking.startTime)} - ${escapeHtml(booking.endTime)}</p>
            <p><strong>Purpose:</strong> ${escapeHtml(booking.purpose)}</p>
            ${booking.amount != null && booking.amount > 0 ? `<p><strong>Amount (was due):</strong> LKR ${booking.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
          </div>

          <p>The time slot has been released. If you believe this is a mistake or you would like to book again, please contact the church office.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: booking.email,
      subject: `Booking automatically cancelled - ${booking.bookingRef}`,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending auto-cancel booking email:', error);
    return false;
  }
}


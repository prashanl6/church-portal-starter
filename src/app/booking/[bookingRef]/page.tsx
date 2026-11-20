'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, Alert, SkeletonList, StatusBadge, EmptyState, longDate } from '@/components/ui';
import { IconCalendar } from '@/components/Icons';

interface Booking {
  id: number;
  bookingRef: string;
  hall: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  requesterName: string;
  email: string;
  phone: string;
  status: string;
  amount: number | null;
  paymentRef: string | null;
  slipReceived: boolean;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const bookingRef = params.bookingRef as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingRef}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking);
          if (data.booking.paymentRef) {
            setPaymentRef(data.booking.paymentRef);
          }
        } else {
          setError('Booking not found');
        }
      } catch (err) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    if (bookingRef) {
      fetchBooking();
    }
  }, [bookingRef]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a receipt file');
      return;
    }
    if (!paymentRef.trim()) {
      setError('Please enter a payment reference');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('paymentRef', paymentRef);

      const res = await fetch(`/api/bookings/${bookingRef}/payment`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess('Payment receipt uploaded successfully. Waiting for admin confirmation.');
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('receipt-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Refresh booking data
        const bookingRes = await fetch(`/api/bookings/${bookingRef}`);
        if (bookingRes.ok) {
          const bookingData = await bookingRes.json();
          setBooking(bookingData.booking);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to upload receipt');
      }
    } catch (err) {
      setError('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: '44rem', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 56, width: '60%' }} />
        <SkeletonList rows={3} height={96} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page" style={{ maxWidth: '44rem', margin: '0 auto' }}>
        <EmptyState
          icon={<IconCalendar />}
          title="Booking not found"
          text="We could not find a booking with this reference. Please check the link in your email, or contact the church office."
          action={<a className="btn-secondary" href="/book-hall">Go to hall bookings</a>}
        />
      </div>
    );
  }

  const NEXT_STEP: Record<string, { tone: 'info' | 'success' | 'warning' | 'error'; title: string; text: string }> = {
    REQUESTED: {
      tone: 'info',
      title: 'Your request is with the church office',
      text: 'An administrator will review it. You will get an email when it is approved, with the amount to pay.',
    },
    APPROVED_PENDING_PAYMENT: {
      tone: 'warning',
      title: 'Approved — please pay to confirm',
      text: 'Pay the amount below using the bank details in your approval email, then upload your payment slip on this page.',
    },
    BOOKED_PAID: {
      tone: 'success',
      title: 'Booking confirmed',
      text: 'Your payment has been confirmed. Your booking is fully paid and confirmed.',
    },
    REJECTED: {
      tone: 'error',
      title: 'Booking rejected',
      text: 'This booking request has been rejected. Please contact us if you have any questions.',
    },
    AUTO_CANCELLED: {
      tone: 'error',
      title: 'Booking automatically cancelled',
      text: 'This booking was cancelled automatically because payment was not fully confirmed at least one hour before the scheduled start time. The time slot has been released. Please contact us if you need help or wish to book again.',
    },
  };
  const step = NEXT_STEP[booking.status];
  const showSlipDone = booking.slipReceived && booking.status === 'APPROVED_PENDING_PAYMENT';

  return (
    <div className="page" style={{ maxWidth: '44rem', margin: '0 auto' }}>
      <PageHeader
        eyebrow={`Booking ${booking.bookingRef}`}
        title="Your hall booking"
        subtitle={`${booking.hall} · ${longDate(booking.date)}`}
      />

      <div className="card stack" style={{ gap: '1.1rem' }}>
        <div>
          <StatusBadge status={booking.status} />
        </div>
        {step && (
          <div>
            <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>
              {showSlipDone ? 'Payment slip received' : step.title}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '1.1rem' }}>
              {showSlipDone ? 'The church office will check your slip and email you once your booking is confirmed.' : step.text}
            </p>
          </div>
        )}
        {booking.amount ? (
          <div style={{ padding: '1.1rem 1.25rem', borderRadius: 'var(--radius)', background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div style={{ color: 'var(--text-2)', fontWeight: 600 }}>Amount to pay</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
              LKR {booking.amount.toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2 className="section-label">Booking details</h2>
        <dl className="details">
          <div><dt>Booking reference</dt><dd>{booking.bookingRef}</dd></div>
          <div><dt>Hall</dt><dd>{booking.hall}</dd></div>
          <div><dt>Date</dt><dd>{longDate(booking.date)}</dd></div>
          <div><dt>Time</dt><dd>{booking.startTime} – {booking.endTime}</dd></div>
          <div><dt>Purpose</dt><dd>{booking.purpose}</dd></div>
          <div><dt>Requested by</dt><dd>{booking.requesterName}</dd></div>
          <div><dt>Email</dt><dd style={{ wordBreak: 'break-all' }}>{booking.email}</dd></div>
          <div><dt>Phone</dt><dd>{booking.phone}</dd></div>
          {booking.paymentRef && <div><dt>Payment reference</dt><dd>{booking.paymentRef}</dd></div>}
          {booking.slipReceived && <div><dt>Payment slip</dt><dd>Received ✓</dd></div>}
        </dl>
      </div>

      {booking.status === 'APPROVED_PENDING_PAYMENT' && (
        <div className="card stack panel-enter" style={{ gap: '1.25rem' }}>
          <div>
            <span className="eyebrow">Last step</span>
            <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Upload Payment Receipt</h2>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>
              Enter the reference from your bank transfer and attach a photo or PDF of the slip.
            </p>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label className="label" htmlFor="payment-ref">Payment Reference *</label>
              <input
                id="payment-ref"
                type="text"
                className="input"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Enter payment reference number"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="receipt-file">Receipt File *</label>
              <input
                id="receipt-file"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                required
                className="input"
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              />
              <p className="hint">A photo (JPG or PNG) or a PDF, up to 4 MB.</p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ width: '100%' }}>
              {uploading ? 'Uploading…' : 'Upload Receipt'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

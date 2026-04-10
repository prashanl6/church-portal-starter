'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
  slipUrl: string | null;
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
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h1>Booking Not Found</h1>
          <p>The booking you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColors: { [key: string]: string } = {
    REQUESTED: 'rgb(251, 191, 36)',
    APPROVED_PENDING_PAYMENT: 'rgb(59, 130, 246)',
    BOOKED_PAID: 'rgb(34, 197, 94)',
    REJECTED: 'rgb(239, 68, 68)',
    AUTO_CANCELLED: 'rgb(194, 65, 12)',
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
      <div className="card">
        <h1 className="page-title" style={{ marginBottom: '1rem' }}>
          Booking Details
        </h1>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '0.5rem 1rem', 
            borderRadius: '0.5rem',
            backgroundColor: statusColors[booking.status] || 'rgb(100, 116, 139)',
            color: 'white',
            fontWeight: 600,
            marginBottom: '1rem'
          }}>
            {booking.status.replace(/_/g, ' ')}
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
            <div>
              <strong>Booking Reference:</strong> {booking.bookingRef}
            </div>
            <div>
              <strong>Hall:</strong> {booking.hall}
            </div>
            <div>
              <strong>Date:</strong> {bookingDate}
            </div>
            <div>
              <strong>Time:</strong> {booking.startTime} - {booking.endTime}
            </div>
            <div>
              <strong>Purpose:</strong> {booking.purpose}
            </div>
            <div>
              <strong>Requester:</strong> {booking.requesterName}
            </div>
            <div>
              <strong>Email:</strong> {booking.email}
            </div>
            <div>
              <strong>Phone:</strong> {booking.phone}
            </div>
            {booking.amount && (
              <div>
                <strong>Amount to Pay:</strong> LKR {booking.amount.toLocaleString()}
              </div>
            )}
            {booking.paymentRef && (
              <div>
                <strong>Payment Reference:</strong> {booking.paymentRef}
              </div>
            )}
            {booking.slipUrl && (
              <div>
                <strong>Receipt:</strong>{' '}
                <a href={booking.slipUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(37, 99, 235)' }}>
                  View Receipt
                </a>
              </div>
            )}
          </div>
        </div>

        {booking.status === 'APPROVED_PENDING_PAYMENT' && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgb(226, 232, 240)' }}>
            <h2 style={{ marginBottom: '1rem' }}>Upload Payment Receipt</h2>
            
            {error && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'rgb(254, 242, 242)', 
                color: 'rgb(220, 38, 38)', 
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'rgb(240, 253, 244)', 
                color: 'rgb(22, 163, 74)', 
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="label">Payment Reference *</label>
                <input
                  type="text"
                  className="input"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Enter payment reference number"
                  required
                />
              </div>
              
              <div>
                <label className="label">Receipt File *</label>
                <input
                  id="receipt-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  required
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid rgb(209, 213, 219)',
                    borderRadius: '0.5rem'
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: 'rgb(100, 116, 139)', marginTop: '0.5rem' }}>
                  Accepted formats: Images (JPG, PNG) or PDF
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
                style={{ justifySelf: 'start' }}
              >
                {uploading ? 'Uploading...' : 'Upload Receipt'}
              </button>
            </form>
          </div>
        )}

        {booking.status === 'BOOKED_PAID' && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            backgroundColor: 'rgb(240, 253, 244)', 
            borderRadius: '0.5rem',
            border: '1px solid rgb(187, 247, 208)'
          }}>
            <h3 style={{ color: 'rgb(22, 163, 74)', marginBottom: '0.5rem' }}>✓ Booking Confirmed</h3>
            <p style={{ color: 'rgb(22, 163, 74)' }}>
              Your payment has been confirmed. Your booking is fully paid and confirmed.
            </p>
          </div>
        )}

        {booking.status === 'REJECTED' && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            backgroundColor: 'rgb(254, 242, 242)', 
            borderRadius: '0.5rem',
            border: '1px solid rgb(254, 202, 202)'
          }}>
            <h3 style={{ color: 'rgb(220, 38, 38)', marginBottom: '0.5rem' }}>Booking Rejected</h3>
            <p style={{ color: 'rgb(220, 38, 38)' }}>
              This booking request has been rejected. Please contact us if you have any questions.
            </p>
          </div>
        )}

        {booking.status === 'AUTO_CANCELLED' && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: 'rgb(255, 247, 237)',
            borderRadius: '0.5rem',
            border: '1px solid rgb(253, 186, 116)'
          }}>
            <h3 style={{ color: 'rgb(194, 65, 12)', marginBottom: '0.5rem' }}>Booking automatically cancelled</h3>
            <p style={{ color: 'rgb(120, 53, 15)' }}>
              This booking was cancelled automatically because payment was not fully confirmed at least one hour before
              the scheduled start time. The time slot has been released. Please contact us if you need help or wish to
              book again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


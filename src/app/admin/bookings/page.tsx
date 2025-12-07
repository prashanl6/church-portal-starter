'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type FilterStatus = 'all' | 'REQUESTED' | 'APPROVED_PENDING_PAYMENT' | 'BOOKED_PAID' | 'REJECTED';

export default function AdminBookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlFilter = searchParams.get('filter') as FilterStatus | null;
  const [filter, setFilter] = useState<FilterStatus>(urlFilter && ['all', 'REQUESTED', 'APPROVED_PENDING_PAYMENT', 'BOOKED_PAID', 'REJECTED'].includes(urlFilter) ? urlFilter : 'all');
  
  // Update filter when URL changes
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FilterStatus | null;
    if (urlFilter && ['all', 'REQUESTED', 'APPROVED_PENDING_PAYMENT', 'BOOKED_PAID', 'REJECTED'].includes(urlFilter)) {
      setFilter(urlFilter);
    } else if (!urlFilter) {
      setFilter('all');
    }
  }, [searchParams]);
  
  const handleFilterChange = (newFilter: FilterStatus) => {
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const { data, mutate } = useSWR('/api/admin/bookings', fetcher);
  
  // Filter bookings based on selected filter
  const filteredBookings = data?.list ? (filter === 'all' 
    ? data.list 
    : data.list.filter((booking: any) => booking.status === filter)
  ) : [];

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Admin — Bookings</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'REQUESTED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('REQUESTED')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'APPROVED_PENDING_PAYMENT' ? 'active' : ''}`}
            onClick={() => handleFilterChange('APPROVED_PENDING_PAYMENT')}
          >
            Approved
          </button>
          <button
            className={`filter-btn ${filter === 'BOOKED_PAID' ? 'active' : ''}`}
            onClick={() => handleFilterChange('BOOKED_PAID')}
          >
            Paid
          </button>
          <button
            className={`filter-btn ${filter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('REJECTED')}
          >
            Rejected
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        {filteredBookings.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No bookings found for the selected filter.</p>
          </div>
        ) : (
          filteredBookings.map((booking: any) => (
            <div key={booking.id} className="card">
              <div className="grid gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">
                      {booking.bookingRef} - {booking.requesterName}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {booking.email} · {booking.phone}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'BOOKED_PAID' ? 'bg-green-100 text-green-800' :
                    booking.status === 'APPROVED_PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'REQUESTED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Hall:</strong> {booking.hall}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(booking.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div>
                    <strong>Time:</strong> {booking.startTime} - {booking.endTime}
                  </div>
                  <div>
                    <strong>Purpose:</strong> {booking.purpose}
                  </div>
                </div>
                {booking.paymentRef && (
                  <div className="text-sm">
                    <strong>Payment Ref:</strong> {booking.paymentRef}
                  </div>
                )}
                {booking.amount && (
                  <div className="text-sm">
                    <strong>Amount:</strong> LKR {booking.amount.toLocaleString()}
                  </div>
                )}
                {booking.status === 'REQUESTED' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn"
                      style={{ background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(22, 163, 74))', color: 'white' }}
                      onClick={async () => {
                        if (!window.confirm(`Approve booking request ${booking.bookingRef}?`)) {
                          return;
                        }
                        try {
                          // Find the approval record for this booking
                          const approvalRes = await fetch('/api/approvals');
                          const approvalData = await approvalRes.json();
                          const approval = approvalData.list?.find((a: any) => 
                            a.resourceType === 'booking' && 
                            a.resourceId === booking.id && 
                            a.status === 'SUBMITTED'
                          );
                          
                          if (!approval) {
                            alert('Approval record not found. Please use the Approvals Queue.');
                            return;
                          }
                          
                          const res = await fetch('/api/approvals/approve', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              resourceType: 'booking',
                              resourceId: booking.id,
                              comment: 'Approved'
                            })
                          });
                          
                          if (res.ok) {
                            alert('Booking approved successfully');
                            mutate();
                          } else {
                            const error = await res.json();
                            alert(error.error || 'Failed to approve booking');
                          }
                        } catch (error) {
                          alert('Failed to approve booking');
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn"
                      style={{ background: 'linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38))', color: 'white' }}
                      onClick={async () => {
                        const reason = window.prompt('Please provide a reason for rejection (required):');
                        if (!reason || reason.trim() === '') {
                          alert('Rejection reason is required');
                          return;
                        }
                        if (!window.confirm(`Reject booking request ${booking.bookingRef}?`)) {
                          return;
                        }
                        try {
                          const res = await fetch('/api/approvals/reject', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              resourceType: 'booking',
                              resourceId: booking.id,
                              comment: reason.trim()
                            })
                          });
                          
                          if (res.ok) {
                            alert('Booking rejected successfully');
                            mutate();
                          } else {
                            const error = await res.json();
                            alert(error.error || 'Failed to reject booking');
                          }
                        } catch (error) {
                          alert('Failed to reject booking');
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {booking.slipUrl && booking.status === 'APPROVED_PENDING_PAYMENT' && (
                  <div className="mt-2 flex gap-2">
                    <a 
                      href={booking.slipUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      View Receipt
                    </a>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (!window.confirm('Confirm that payment receipt is valid and mark booking as fully paid?')) {
                          return;
                        }
                        try {
                          const res = await fetch(`/api/admin/bookings/${booking.id}/confirm-payment`, {
                            method: 'POST',
                          });
                          if (res.ok) {
                            alert('Payment confirmed successfully');
                            mutate();
                          } else {
                            const error = await res.json();
                            alert(error.error || 'Failed to confirm payment');
                          }
                        } catch (error) {
                          alert('Failed to confirm payment');
                        }
                      }}
                    >
                      Confirm Payment
                    </button>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn btn-delete"
                    style={{ 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.875rem'
                    }}
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to request deletion of booking ${booking.bookingRef}? This will require approval before the booking is deleted.`)) {
                        return;
                      }
                      try {
                        const res = await fetch(`/api/admin/bookings/${booking.id}`, {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          alert('Delete request submitted for approval');
                          mutate();
                        } else {
                          const error = await res.json();
                          alert(error.error || 'Failed to submit delete request');
                        }
                      } catch (error) {
                        alert('Failed to submit delete request');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Created: {new Date(booking.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


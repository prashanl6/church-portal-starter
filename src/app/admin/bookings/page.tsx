'use client';
import useSWR from 'swr';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader, ADMIN_BACK, EmptyState, SkeletonList, StatusBadge, DateChip, longDate } from '@/components/ui';
import { IconCalendar } from '@/components/Icons';

const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  REQUESTED: 'Pending',
  APPROVED_PENDING_PAYMENT: 'Approved',
  BOOKED_PAID: 'Paid',
  REJECTED: 'Rejected',
  AUTO_CANCELLED: 'Auto-cancelled',
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

async function hallSettingsFetcher(url: string) {
  const res = await fetch(url, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  }
  return data;
}

type FilterStatus =
  | 'all'
  | 'REQUESTED'
  | 'APPROVED_PENDING_PAYMENT'
  | 'BOOKED_PAID'
  | 'REJECTED'
  | 'AUTO_CANCELLED';

const FILTER_OPTIONS: FilterStatus[] = [
  'all',
  'REQUESTED',
  'APPROVED_PENDING_PAYMENT',
  'BOOKED_PAID',
  'REJECTED',
  'AUTO_CANCELLED',
];

function AdminBookingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlFilter = searchParams.get('filter') as FilterStatus | null;
  const [filter, setFilter] = useState<FilterStatus>(
    urlFilter && FILTER_OPTIONS.includes(urlFilter) ? urlFilter : 'all'
  );
  
  // Update filter when URL changes
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FilterStatus | null;
    if (urlFilter && FILTER_OPTIONS.includes(urlFilter)) {
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
  const {
    data: hallSettings,
    mutate: mutateHallSettings,
    error: hallSettingsError,
    isLoading: hallSettingsLoading
  } = useSWR('/api/admin/hall-booking-settings', hallSettingsFetcher);
  const [rateDraft, setRateDraft] = useState('');
  const [rateSaving, setRateSaving] = useState(false);

  useEffect(() => {
    if (hallSettings && typeof hallSettings.ratePer30Minutes === 'number') {
      setRateDraft(String(hallSettings.ratePer30Minutes));
    }
  }, [hallSettings]);
  
  // Filter bookings based on selected filter
  const filteredBookings = data?.list ? (filter === 'all' 
    ? data.list 
    : data.list.filter((booking: any) => booking.status === filter)
  ) : [];

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        title="Hall bookings"
        subtitle="Review requests, check payment slips and set the hall hire rate."
      />

      <div className="stack">
        <div className="segmented" role="tablist" aria-label="Filter bookings">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? 'is-active' : ''}
              onClick={() => handleFilterChange(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {!data ? (
          <SkeletonList rows={3} height={140} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState icon={<IconCalendar />} title="No bookings here" text="There are no bookings with this status." />
        ) : (
          filteredBookings.map((booking: any) => (
            <div key={booking.id} className="card">
              <div className="stack" style={{ gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <DateChip date={booking.date} />
                  <div style={{ flex: '1 1 14rem', minWidth: 0 }}>
                    <div style={{ fontWeight: 650, fontSize: '1.2rem' }}>
                      {booking.requesterName} · <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{booking.bookingRef}</span>
                    </div>
                    <div style={{ color: 'var(--text-2)', marginTop: '0.15rem' }}>
                      {booking.hall} · {longDate(booking.date)} · {booking.startTime} – {booking.endTime}
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                <dl className="details">
                  <div><dt>Purpose</dt><dd>{booking.purpose}</dd></div>
                  <div><dt>Contact</dt><dd style={{ wordBreak: 'break-word' }}>{booking.email} · {booking.phone}</dd></div>
                {booking.paymentRef && (
                  <div><dt>Payment reference</dt><dd>{booking.paymentRef}</dd></div>
                )}
                {booking.amount != null && (
                  <div><dt>Amount</dt><dd>LKR{' '}
                    {Number(booking.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</dd>
                  </div>
                )}
                </dl>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                {booking.status === 'REQUESTED' && (
                  <>
                    <button
                      className="btn btn-sm"
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
                      className="btn-secondary btn-sm"
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
                  </>
                )}
                {booking.slipUrl && booking.status === 'APPROVED_PENDING_PAYMENT' && (
                  <>
                    <a
                      href={booking.slipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm"
                    >
                      View Receipt
                    </a>
                    <button
                      className="btn btn-sm"
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
                  </>
                )}
                  <button
                    className="btn-quiet danger"
                    style={{ marginLeft: 'auto' }}
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
                <div style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>
                  Requested {new Date(booking.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card stack" style={{ gap: '1rem' }}>
        <div>
          <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Hall hire pricing</h2>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>
            The amount charged per <strong>30-minute block</strong>. Public bookings multiply the number of blocks
            (rounded up) by this rate to show an estimated total. A change needs a second administrator to approve it.
          </p>
        </div>
        {hallSettingsLoading && <p style={{ margin: 0, color: 'var(--text-3)' }}>Loading current rate…</p>}
        {hallSettingsError && (
          <div className="alert alert-error" role="alert">
            Could not load hall pricing: {hallSettingsError.message}. If you recently ran a database migration, restart
            the dev server and run <code>npx prisma generate</code>.
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div style={{ flex: '0 1 16rem' }}>
            <label className="label" htmlFor="hall-rate">LKR per 30 minutes</label>
            <input
              id="hall-rate"
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn"
            disabled={rateSaving}
            onClick={async () => {
              const n = parseFloat(rateDraft);
              if (!Number.isFinite(n) || n < 0) {
                alert('Enter a valid non-negative number');
                return;
              }
              setRateSaving(true);
              try {
                const res = await fetch('/api/admin/hall-booking-settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({ ratePer30Minutes: n })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  alert(data.error || 'Failed to save');
                  return;
                }
                await mutateHallSettings();
                alert(data.message || 'Sent for approval');
              } finally {
                setRateSaving(false);
              }
            }}
          >
            {rateSaving ? 'Saving…' : 'Save rate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ paddingTop: '2rem' }}>
          <SkeletonList rows={3} height={140} />
        </div>
      }
    >
      <AdminBookingsPageContent />
    </Suspense>
  );
}

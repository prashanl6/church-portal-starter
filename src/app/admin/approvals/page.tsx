'use client';
import { tell } from '@/components/Dialog';
import useSWR from 'swr';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader, ADMIN_BACK, EmptyState, Alert, SkeletonList, StatusBadge, longDate } from '@/components/ui';
import { IconCheck } from '@/components/Icons';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

type FilterStatus = 'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  notice: 'Notice',
  sermon: 'Sermon',
  process: 'Process document',
  booking: 'Hall booking',
  church_bank_account: 'Church bank details',
  individual: 'Birthday register',
  anniversary: 'Wedding anniversary',
  hall_settings: 'Hall hire rate',
  user: 'Account',
};

function ApprovalsPageContent() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter') as FilterStatus | null;
  // Default to 'SUBMITTED' (Pending) if no filter is specified
  const [filter, setFilter] = useState<FilterStatus>(urlFilter && ['all', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(urlFilter) ? urlFilter : 'SUBMITTED');
  
  const router = useRouter();
  
  // Update filter when URL changes
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FilterStatus | null;
    if (urlFilter && ['all', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(urlFilter)) {
      setFilter(urlFilter);
    } else if (!urlFilter) {
      // If no filter in URL, default to SUBMITTED (Pending)
      setFilter('SUBMITTED');
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
    router.push(`/admin/approvals?${params.toString()}`);
  };
  
  const { data, mutate } = useSWR('/api/approvals', fetcher);
  const [comment, setComment] = useState<{ [key: number]: string }>({});
  const [showActions, setShowActions] = useState<{ [key: number]: boolean }>({});
  
  // Filter the approvals based on selected filter
  const filteredList = data?.list ? (filter === 'all' 
    ? data.list 
    : data.list.filter((a: any) => a.status === filter)
  ) : [];

  const approve = async (a:any) => {
    const res = await fetch('/api/approvals/approve', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({ 
 approvalId: a.id, comment: comment[a.id] || 'Approved' 
      }) 
    });
    if (res.status === 401) {
      tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
      return;
    }
    if (res.ok) {
      setComment({ ...comment, [a.id]: '' });
      setShowActions({ ...showActions, [a.id]: false });
      mutate();
    } else {
      const body = await res.json().catch(() => ({}));
      tell(body.error || 'Could not approve. Please try again.');
      mutate();
    }
  }

  const rejectApproval = async (a:any) => {
    // For bookings, comment is mandatory
    const isBooking = a.resourceType === 'booking';
    if (!comment[a.id] || comment[a.id].trim() === '') {
      if (isBooking) {
        tell('Rejection reason is required for booking rejections');
      } else {
        tell('Please provide a reason for rejection');
      }
      return;
    }
    const res = await fetch('/api/approvals/reject', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({ 
 approvalId: a.id, comment: comment[a.id] 
      }) 
    });
    if (res.status === 401) {
      tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
      return;
    }
    if (res.ok) {
      setComment({ ...comment, [a.id]: '' });
      setShowActions({ ...showActions, [a.id]: false });
      mutate();
    } else {
      const body = await res.json().catch(() => ({}));
      tell(body.error || 'Could not reject. Please try again.');
      mutate();
    }
  }
  const FILTERS: [FilterStatus, string][] = [
    ['SUBMITTED', 'Pending'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
    ['all', 'All'],
  ];

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        title="Approvals"
        subtitle="Every change needs a second administrator before it goes live. Check the details, then approve or reject."
      />

      <div className="segmented" role="tablist" aria-label="Show approvals">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? 'is-active' : ''}
            onClick={() => handleFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="stack">
        {!data ? (
          <SkeletonList rows={3} height={160} />
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon={<IconCheck />}
            title={filter === 'SUBMITTED' ? 'All caught up' : 'Nothing to show'}
            text={filter === 'SUBMITTED' ? 'No changes are waiting for approval.' : 'No approvals found for the selected filter.'}
          />
        ) : (
          filteredList.map((a: any, idx: number) => (
            <div key={a.id} className="card panel-enter" style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 28rem', minWidth: 0 }} className="stack-sm">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="eyebrow" style={{ margin: 0 }}>
                      {TYPE_LABELS[a.resourceType] || a.resourceType}
                      {a.resourceId ? ` #${a.resourceId}` : ' (new)'}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <h2 className="section-label" style={{ margin: 0 }}>
                    {actionLabel(a)}
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-2)' }}>
                    Requested by{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {a.submitter?.email === 'system@church.local'
                        ? 'the public website'
                        : a.submitter?.name || a.submitter?.email || 'unknown'}
                    </strong>{' '}
                    on{' '}
                    {new Date(a.createdAt).toLocaleString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {a.status === 'APPROVED' && (
                    <p style={{ margin: 0, color: '#2f6b47', fontWeight: 600 }}>
                      Approved{approvedSuffix(a)}
                    </p>
                  )}
                  {a.approver1 && (
                    <p style={{ margin: 0, color: 'var(--text-3)' }}>
                      {a.status === 'REJECTED' ? 'Reviewed' : 'Approved'} by {a.approver1.name || a.approver1.email}
                      {a.comment1 && `: “${a.comment1}”`}
                    </p>
                  )}
                  {a.approver2 && (
                    <p style={{ margin: 0, color: 'var(--text-3)' }}>
                      Second approval by {a.approver2.name || a.approver2.email}
                      {a.comment2 && `: “${a.comment2}”`}
                    </p>
                  )}

                  <div style={{ marginTop: '0.75rem' }} className="stack-sm">
                    {/* Notice */}
                    {a.noticeDetails && (
                      <DetailBox>
                        {a.action === 'delete' && !a.noticeDetails.deleted && (
                          <Alert tone="error">
                            <strong>Delete request.</strong> This notice will be permanently deleted if approved.
                          </Alert>
                        )}
                        {a.noticeDetails.deleted ? (
                          <Gone what="Notice" label="Title" value={a.noticeDetails.title} />
                        ) : (
                          <>
                            <div style={{ fontWeight: 650, fontSize: '1.15rem' }}>{a.noticeDetails.title}</div>
                            <div style={{ color: 'var(--text-3)' }}>Week of {longDate(a.noticeDetails.weekOf)}</div>
                            <div
                              className="notice-content"
                              style={{ fontSize: '1.02rem' }}
                              dangerouslySetInnerHTML={{ __html: a.noticeDetails.bodyHtml }}
                            />
                          </>
                        )}
                      </DetailBox>
                    )}

                    {a.genericDetails && (
                      <DetailBox>
                        <div style={{ fontWeight: 650 }}>{a.genericDetails.heading}</div>
                        <dl className="details">
                          {a.genericDetails.rows.map(([label, value]: [string, string]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </DetailBox>
                    )}

                    {/* Booking */}
                    {a.bookingDetails && (
                      <DetailBox>
                        {a.action === 'delete' && !a.bookingDetails.deleted && (
                          <Alert tone="error">
                            <strong>Delete request.</strong> This booking will be permanently deleted if approved.
                          </Alert>
                        )}
                        {a.action === 'confirm_payment' && (
                          <Alert tone="info">
                            <strong>Payment receipt submitted.</strong> Check the receipt, then confirm the payment.
                          </Alert>
                        )}
                        {a.bookingDetails.deleted ? (
                          <Gone what="Booking" label="Booking reference" value={a.bookingDetails.bookingRef} />
                        ) : (
                          <dl className="details">
                            <Row label="Booking reference" value={a.bookingDetails.bookingRef} />
                            <Row label="Requested by" value={`${a.bookingDetails.requesterName} (${a.bookingDetails.email})`} />
                            <Row label="Hall" value={a.bookingDetails.hall} />
                            <Row label="Date" value={longDate(a.bookingDetails.date)} />
                            <Row label="Time" value={`${a.bookingDetails.startTime} – ${a.bookingDetails.endTime}`} />
                            <Row label="Purpose" value={a.bookingDetails.purpose} />
                            {a.action === 'confirm_payment' && a.bookingDetails.amount && (
                              <Row label="Amount" value={`LKR ${a.bookingDetails.amount.toLocaleString()}`} />
                            )}
                            {a.action === 'confirm_payment' && a.bookingDetails.paymentRef && (
                              <Row label="Payment reference" value={a.bookingDetails.paymentRef} />
                            )}
                            {a.action === 'confirm_payment' && a.bookingDetails.slipUrl && (
                              <div>
                                <dt>Receipt</dt>
                                <dd>
                                  <a href={a.bookingDetails.slipUrl} target="_blank" rel="noopener noreferrer">
                                    View Receipt
                                  </a>
                                </dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </DetailBox>
                    )}

                    {a.churchBankAccountDetails && (
                      <DetailBox>
                        <div style={{ fontWeight: 650 }}>Church bank account details (shown in booking emails)</div>
                        <dl className="details">
                          <Row label="Account number" value={a.churchBankAccountDetails.accountNumber} />
                          <Row label="Account name" value={a.churchBankAccountDetails.accountName} />
                          <Row label="Bank" value={a.churchBankAccountDetails.bankName} />
                          <Row label="Branch" value={a.churchBankAccountDetails.branch} />
                        </dl>
                      </DetailBox>
                    )}

                    {/* Sermon */}
                    {a.sermonDetails && (
                      <DetailBox>
                        {a.action === 'delete' && !a.sermonDetails.deleted && (
                          <Alert tone="error">
                            <strong>Delete request.</strong> This sermon will be permanently deleted if approved.
                          </Alert>
                        )}
                        {a.sermonDetails.deleted ? (
                          <Gone what="Sermon" label="Title" value={a.sermonDetails.title} />
                        ) : (
                          <dl className="details">
                            <Row label="Title" value={a.sermonDetails.title} />
                            <Row label="Speaker" value={a.sermonDetails.speaker} />
                            <Row label="Date" value={longDate(a.sermonDetails.date)} />
                            <div>
                              <dt>Link</dt>
                              <dd style={{ wordBreak: 'break-all' }}>
                                <a href={a.sermonDetails.link} target="_blank" rel="noopener noreferrer">
                                  {a.sermonDetails.link}
                                </a>
                              </dd>
                            </div>
                            <div>
                              <dt>Status</dt>
                              <dd><StatusBadge status={a.sermonDetails.status} /></dd>
                            </div>
                          </dl>
                        )}
                      </DetailBox>
                    )}

                    {/* Asset */}
                    {a.assetDetails && (
                      <DetailBox>
                        {a.action === 'delete' && !a.assetDetails.deleted && (
                          <Alert tone="error">
                            <strong>Delete request.</strong> This asset will be permanently deleted if approved.
                          </Alert>
                        )}
                        {a.action === 'update' && a.assetDetails.proposedChanges && (
                          <Alert tone="info">
                            <strong>Update request.</strong> These changes will be applied if approved.
                          </Alert>
                        )}
                        {a.assetDetails.deleted ? (
                          <Gone what="Asset" label="Reference" value={a.assetDetails.reference} />
                        ) : a.action === 'update' && a.assetDetails.proposedChanges ? (
                          <Compare
                            current={<AssetRows d={a.assetDetails} />}
                            proposed={<AssetRows d={a.assetDetails.proposedChanges} showEmptyNotes />}
                          />
                        ) : (
                          <dl className="details">
                            <AssetRows d={a.assetDetails} />
                          </dl>
                        )}
                      </DetailBox>
                    )}

                    {/* Process */}
                    {a.processDetails && (
                      <DetailBox>
                        {a.action === 'delete' && !a.processDetails.deleted && (
                          <Alert tone="error">
                            <strong>Delete request.</strong> This process document will be permanently deleted if approved.
                          </Alert>
                        )}
                        {a.action === 'update' && a.processDetails.proposedChanges && (
                          <Alert tone="info">
                            <strong>Update request.</strong> These changes will be applied if approved.
                          </Alert>
                        )}
                        {a.processDetails.deleted ? (
                          <Gone what="Process document" label="Title" value={a.processDetails.title} />
                        ) : a.action === 'update' && a.processDetails.proposedChanges ? (
                          <Compare
                            current={
                              <>
                                <Row label="Title" value={a.processDetails.title} />
                                <Row label="Tag" value={a.processDetails.audience} />
                                <Row label="Version" value={String(a.processDetails.version)} />
                                <ContentPreview html={a.processDetails.contentHtml.substring(0, 200) + '...'} />
                              </>
                            }
                            proposed={
                              <>
                                <Row label="Title" value={a.processDetails.proposedChanges.title} />
                                <Row label="Tag" value={a.processDetails.proposedChanges.audience ?? a.processDetails.audience} />
                                <Row label="Version" value={String(a.processDetails.version + 1)} />
                                <ContentPreview html={a.processDetails.proposedChanges.contentHtml.substring(0, 200) + '...'} />
                                {a.processDetails.attachmentsToRemove && a.processDetails.attachmentsToRemove.length > 0 && (
                                  <div style={{ display: 'block' }}>
                                    <dt style={{ color: 'var(--danger)', fontWeight: 600 }}>Attachments to remove if approved</dt>
                                    <dd style={{ textAlign: 'left', fontWeight: 400 }}>
                                      <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', margin: '0.35rem 0 0' }}>
                                        {a.processDetails.attachmentsToRemove.map((att: { id: number; fileName: string }) => (
                                          <li key={att.id}>{att.fileName}</li>
                                        ))}
                                      </ul>
                                    </dd>
                                  </div>
                                )}
                              </>
                            }
                          />
                        ) : (
                          <>
                            <dl className="details">
                              <Row label="Title" value={a.processDetails.title} />
                              <Row label="Version" value={String(a.processDetails.version)} />
                              <div>
                                <dt>Status</dt>
                                <dd><StatusBadge status={a.processDetails.status} /></dd>
                              </div>
                            </dl>
                            <div
                              className="notice-content"
                              style={{ fontSize: '1.02rem', maxHeight: '300px', overflow: 'auto' }}
                              dangerouslySetInnerHTML={{ __html: a.processDetails.contentHtml }}
                            />
                          </>
                        )}
                      </DetailBox>
                    )}
                  </div>
                </div>

                {a.status === 'SUBMITTED' && !a.canAct && (
                  <div style={{ flex: '1 1 16rem', maxWidth: '22rem' }}>
                    <Alert tone="info">
                      {a.isMine
                        ? 'You made this request. Another administrator must approve it.'
                        : 'Only administrators can approve or reject.'}
                    </Alert>
                  </div>
                )}

                {a.status === 'SUBMITTED' && a.canAct && (
                  <div style={{ flex: '1 1 16rem', maxWidth: '22rem', display: 'grid', gap: '0.75rem' }}>
                    {!showActions[a.id] ? (
                      <button className="btn" onClick={() => setShowActions({ ...showActions, [a.id]: true })}>
                        Review & Approve
                      </button>
                    ) : (
                      <div className="panel-enter" style={{ display: 'grid', gap: '0.75rem' }}>
                        <label className="label" htmlFor={`comment-${a.id}`} style={{ marginBottom: 0 }}>
                          Comment
                        </label>
                        <textarea
                          id={`comment-${a.id}`}
                          className="input"
                          rows={3}
                          placeholder="Optional when approving. Required when rejecting."
                          value={comment[a.id] || ''}
                          onChange={(e) => setComment({ ...comment, [a.id]: e.target.value })}
                        />
                        <p className="hint" style={{ margin: 0 }}>
                          {a.resourceType === 'booking' && a.action === 'approve'
                            ? 'Note: Rejection reason is mandatory for booking rejections'
                            : 'If you reject, please write the reason above.'}
                        </p>
                        <button className="btn" onClick={() => approve(a)}>
                          Approve
                        </button>
                        <button className="btn-quiet danger" style={{ justifyContent: 'center' }} onClick={() => rejectApproval(a)}>
                          Reject
                        </button>
                        <button
                          className="btn-quiet"
                          style={{ justifyContent: 'center', color: 'var(--text-2)' }}
                          onClick={() => {
                            setShowActions({ ...showActions, [a.id]: false });
                            setComment({ ...comment, [a.id]: '' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function actionLabel(a: any): string {
  if (a.action === 'confirm_payment') return 'Confirm payment';
  if (a.action === 'approve') return 'Approve booking';
  if (a.action === 'delete' && a.resourceType === 'booking') return 'Delete booking';
  if (a.resourceType === 'church_bank_account' && a.action === 'update') return 'Update church bank account';
  if (a.resourceType === 'user') return a.action === 'create' ? 'Add an account' : 'Switch off an account';
  const verbs: Record<string, string> = {
    create: 'Add new',
    update: 'Change',
    delete: 'Delete',
    publish: 'Publish',
  };
  const what = (TYPE_LABELS[a.resourceType] || a.resourceType || '').toLowerCase();
  return verbs[a.action] ? `${verbs[a.action]} ${what}` : String(a.action);
}

function approvedSuffix(a: any): string {
  const t = a.resourceType;
  if ((t === 'notice' || t === 'sermon' || t === 'process') && a.action === 'publish') return ' and published';
  if (t === 'booking' && a.action === 'approve') return ' (pending payment)';
  if (t === 'booking' && a.action === 'confirm_payment') return ' (payment confirmed)';
  if (['asset', 'notice', 'sermon', 'process', 'booking'].includes(t) && a.action === 'delete') return ' and deleted';
  if (t === 'church_bank_account' && a.action === 'update') return ' (bank details published)';
  return '';
}

function DetailBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="stack-sm"
      style={{
        padding: '1.1rem 1.25rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Gone({ what, label, value }: { what: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontWeight: 650 }}>{what} has been deleted</div>
      <div style={{ color: 'var(--text-3)' }}>
        {label}: {value}
      </div>
    </div>
  );
}

function money(n: number) {
  return `LKR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AssetRows({ d, showEmptyNotes }: { d: any; showEmptyNotes?: boolean }) {
  return (
    <>
      <Row label="Reference" value={d.reference} />
      <Row label="Value" value={money(d.value)} />
      <Row label="Quantity" value={Number(d.quantity).toLocaleString()} />
      <Row label="Category" value={d.labelCategory} />
      {showEmptyNotes
        ? d.notes !== undefined && <Row label="Notes" value={d.notes || '(empty)'} />
        : d.notes && <Row label="Notes" value={d.notes} />}
    </>
  );
}

function ContentPreview({ html }: { html: string }) {
  return (
    <div style={{ display: 'block' }}>
      <dt>Content</dt>
      <dd style={{ textAlign: 'left', fontWeight: 400 }}>
        <div
          className="notice-content"
          style={{ fontSize: '0.98rem', maxHeight: '110px', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </dd>
    </div>
  );
}

function Compare({ current, proposed }: { current: React.ReactNode; proposed: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))' }}>
      <div>
        <div style={{ fontWeight: 650, color: 'var(--text-3)', marginBottom: '0.25rem' }}>Now</div>
        <dl className="details">{current}</dl>
      </div>
      <div>
        <div style={{ fontWeight: 650, color: 'var(--accent)', marginBottom: '0.25rem' }}>After approval</div>
        <dl className="details">{proposed}</dl>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<SkeletonList rows={3} height={160} />}>
      <ApprovalsPageContent />
    </Suspense>
  );
}

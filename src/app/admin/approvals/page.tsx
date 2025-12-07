'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

type FilterStatus = 'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export default function ApprovalsPage() {
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
        resourceType:a.resourceType, 
        resourceId:a.resourceId, 
        comment: comment[a.id] || 'Approved' 
      }) 
    });
    if (res.status === 401) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      setComment({ ...comment, [a.id]: '' });
      setShowActions({ ...showActions, [a.id]: false });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to approve');
    }
  }

  const rejectApproval = async (a:any) => {
    if (!comment[a.id] || comment[a.id].trim() === '') {
      alert('Please provide a reason for rejection');
      return;
    }
    const res = await fetch('/api/approvals/reject', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({ 
        resourceType:a.resourceType, 
        resourceId:a.resourceId, 
        comment: comment[a.id] 
      }) 
    });
    if (res.status === 401) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      setComment({ ...comment, [a.id]: '' });
      setShowActions({ ...showActions, [a.id]: false });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to reject');
    }
  }
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
      <h1 className="text-2xl font-semibold">Approvals</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            className={`filter-btn ${filter === 'SUBMITTED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('SUBMITTED')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('APPROVED')}
          >
            Approved
          </button>
          <button
            className={`filter-btn ${filter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('REJECTED')}
          >
            Rejected
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        {filteredList.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No approvals found for the selected filter.</p>
          </div>
        ) : (
          filteredList.map((a:any)=>(
          <div key={a.id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold text-lg">{a.resourceType} #{a.resourceId}</div>
                <div className="text-sm text-gray-600 mb-2">
                  Action: {a.action} · Status: {a.status}
                  {a.status === 'SUBMITTED' && !a.approver1 && (
                    <span className="ml-2 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                      ⏳ Waiting for approval
                    </span>
                  )}
                  {a.status === 'APPROVED' && (
                    <span className="ml-2 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                      ✓ Approved{
                        a.resourceType === 'notice' && a.action === 'publish' ? ' and published' :
                        a.resourceType === 'sermon' && a.action === 'publish' ? ' and published' :
                        a.resourceType === 'process' && a.action === 'publish' ? ' and published' :
                        a.resourceType === 'booking' ? ' (pending payment)' :
                        (a.resourceType === 'asset' || a.resourceType === 'notice' || a.resourceType === 'sermon' || a.resourceType === 'process') && a.action === 'delete' ? ' and deleted' :
                        ''
                      }
                    </span>
                  )}
                  {a.approver1 && (
                    <div className="mt-1 text-xs text-gray-500">
                      ✓ First approval by {a.approver1.name || a.approver1.email}
                      {a.comment1 && `: "${a.comment1}"`}
                    </div>
                  )}
                  {a.approver2 && (
                    <div className="mt-1 text-xs text-gray-500">
                      ✓ Second approval by {a.approver2.name || a.approver2.email}
                      {a.comment2 && `: "${a.comment2}"`}
                    </div>
                  )}
                </div>
                
                {/* Notice Details */}
                {a.noticeDetails && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {a.action === 'delete' && !a.noticeDetails.deleted && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-semibold text-red-800">⚠️ Delete Request</div>
                        <div className="text-xs text-red-700 mt-1">This notice will be permanently deleted if approved.</div>
                      </div>
                    )}
                    {a.noticeDetails.deleted ? (
                      <div className="mb-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="font-semibold text-gray-700">Notice has been deleted</div>
                        <div className="text-xs text-gray-600 mt-1">Title: {a.noticeDetails.title}</div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          <div className="font-semibold text-base mb-1">{a.noticeDetails.title}</div>
                          <div className="text-sm text-gray-600">
                            Week of: {new Date(a.noticeDetails.weekOf).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                        <div 
                          className="notice-content text-sm"
                          dangerouslySetInnerHTML={{ __html: a.noticeDetails.bodyHtml }}
                          style={{
                            lineHeight: '1.6',
                            color: 'rgb(55, 65, 81)',
                            maxWidth: '100%'
                          }}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Booking Details */}
                {a.bookingDetails && (
                  <div className="mt-2 text-sm space-y-1">
                    <div><strong>Booking Ref:</strong> {a.bookingDetails.bookingRef}</div>
                    <div><strong>Requester:</strong> {a.bookingDetails.requesterName} ({a.bookingDetails.email})</div>
                    <div><strong>Hall:</strong> {a.bookingDetails.hall}</div>
                    <div><strong>Date:</strong> {new Date(a.bookingDetails.date).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {a.bookingDetails.startTime} - {a.bookingDetails.endTime}</div>
                    <div><strong>Purpose:</strong> {a.bookingDetails.purpose}</div>
                  </div>
                )}

                {/* Sermon Details */}
                {a.sermonDetails && (
                  <div className="mt-2 text-sm space-y-1">
                    {a.action === 'delete' && !a.sermonDetails.deleted && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-semibold text-red-800">⚠️ Delete Request</div>
                        <div className="text-xs text-red-700 mt-1">This sermon will be permanently deleted if approved.</div>
                      </div>
                    )}
                    {a.sermonDetails.deleted ? (
                      <div className="mb-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="font-semibold text-gray-700">Sermon has been deleted</div>
                        <div className="text-xs text-gray-600 mt-1">Title: {a.sermonDetails.title}</div>
                      </div>
                    ) : (
                      <>
                        <div><strong>Title:</strong> {a.sermonDetails.title}</div>
                        <div><strong>Speaker:</strong> {a.sermonDetails.speaker}</div>
                        <div><strong>Date:</strong> {new Date(a.sermonDetails.date).toLocaleDateString()}</div>
                        <div><strong>Link:</strong> <a href={a.sermonDetails.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{a.sermonDetails.link}</a></div>
                        <div><strong>Status:</strong> {a.sermonDetails.status}</div>
                      </>
                    )}
                  </div>
                )}

                {/* Asset Details */}
                {a.assetDetails && (
                  <div className="mt-2 text-sm space-y-1">
                    {a.action === 'delete' && !a.assetDetails.deleted && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-semibold text-red-800">⚠️ Delete Request</div>
                        <div className="text-xs text-red-700 mt-1">This asset will be permanently deleted if approved.</div>
                      </div>
                    )}
                    {a.action === 'update' && a.assetDetails.proposedChanges && (
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-semibold text-blue-800">📝 Update Request</div>
                        <div className="text-xs text-blue-700 mt-1">The following changes will be applied if approved:</div>
                      </div>
                    )}
                    {a.assetDetails.deleted ? (
                      <div className="mb-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="font-semibold text-gray-700">Asset has been deleted</div>
                        <div className="text-xs text-gray-600 mt-1">Reference: {a.assetDetails.reference}</div>
                      </div>
                    ) : a.action === 'update' && a.assetDetails.proposedChanges ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-semibold text-xs text-gray-500 mb-2">Current Values</div>
                          <div><strong>Reference:</strong> {a.assetDetails.reference}</div>
                          <div><strong>Value:</strong> LKR {a.assetDetails.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div><strong>Quantity:</strong> {a.assetDetails.quantity.toLocaleString()}</div>
                          <div><strong>Category:</strong> {a.assetDetails.labelCategory}</div>
                          {a.assetDetails.notes && <div><strong>Notes:</strong> {a.assetDetails.notes}</div>}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-blue-600 mb-2">Proposed Changes</div>
                          <div><strong>Reference:</strong> {a.assetDetails.proposedChanges.reference}</div>
                          <div><strong>Value:</strong> LKR {a.assetDetails.proposedChanges.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div><strong>Quantity:</strong> {a.assetDetails.proposedChanges.quantity.toLocaleString()}</div>
                          <div><strong>Category:</strong> {a.assetDetails.proposedChanges.labelCategory}</div>
                          {a.assetDetails.proposedChanges.notes !== undefined && (
                            <div><strong>Notes:</strong> {a.assetDetails.proposedChanges.notes || '(empty)'}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div><strong>Reference:</strong> {a.assetDetails.reference}</div>
                        <div><strong>Value:</strong> LKR {a.assetDetails.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div><strong>Quantity:</strong> {a.assetDetails.quantity.toLocaleString()}</div>
                        <div><strong>Category:</strong> {a.assetDetails.labelCategory}</div>
                        {a.assetDetails.notes && <div><strong>Notes:</strong> {a.assetDetails.notes}</div>}
                      </>
                    )}
                  </div>
                )}

                {/* Process Details */}
                {a.processDetails && (
                  <div className="mt-2 text-sm space-y-1">
                    {a.action === 'delete' && !a.processDetails.deleted && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-semibold text-red-800">⚠️ Delete Request</div>
                        <div className="text-xs text-red-700 mt-1">This process document will be permanently deleted if approved.</div>
                      </div>
                    )}
                    {a.action === 'update' && a.processDetails.proposedChanges && (
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-semibold text-blue-800">📝 Update Request</div>
                        <div className="text-xs text-blue-700 mt-1">The following changes will be applied if approved:</div>
                      </div>
                    )}
                    {a.processDetails.deleted ? (
                      <div className="mb-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="font-semibold text-gray-700">Process document has been deleted</div>
                        <div className="text-xs text-gray-600 mt-1">Title: {a.processDetails.title}</div>
                      </div>
                    ) : a.action === 'update' && a.processDetails.proposedChanges ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-semibold text-xs text-gray-500 mb-2">Current Values</div>
                          <div><strong>Title:</strong> {a.processDetails.title}</div>
                          <div><strong>Version:</strong> {a.processDetails.version}</div>
                          <div className="mt-2">
                            <strong>Content:</strong>
                            <div 
                              className="notice-content text-xs mt-1"
                              dangerouslySetInnerHTML={{ __html: a.processDetails.contentHtml.substring(0, 200) + '...' }}
                              style={{ maxHeight: '100px', overflow: 'hidden' }}
                            />
                          </div>
                        </div>
            <div>
                          <div className="font-semibold text-xs text-blue-600 mb-2">Proposed Changes</div>
                          <div><strong>Title:</strong> {a.processDetails.proposedChanges.title}</div>
                          <div><strong>Version:</strong> {a.processDetails.version + 1}</div>
                          <div className="mt-2">
                            <strong>Content:</strong>
                            <div 
                              className="notice-content text-xs mt-1"
                              dangerouslySetInnerHTML={{ __html: a.processDetails.proposedChanges.contentHtml.substring(0, 200) + '...' }}
                              style={{ maxHeight: '100px', overflow: 'hidden' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div><strong>Title:</strong> {a.processDetails.title}</div>
                        <div><strong>Version:</strong> {a.processDetails.version}</div>
                        <div><strong>Status:</strong> {a.processDetails.status}</div>
                        <div className="mt-2">
                          <strong>Content:</strong>
                          <div 
                            className="notice-content text-sm mt-1"
                            dangerouslySetInnerHTML={{ __html: a.processDetails.contentHtml }}
                            style={{ maxHeight: '300px', overflow: 'auto' }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {a.status==='SUBMITTED' && (
                <div className="ml-4 flex flex-col gap-2 min-w-[200px]">
                  {!showActions[a.id] ? (
                    <button className="btn" onClick={() => setShowActions({ ...showActions, [a.id]: true })}>
                      Review & Approve
                    </button>
                  ) : (
                    <>
                      <textarea
                        className="input text-sm"
                        rows={3}
                        placeholder="Add a comment (optional for approval, required for rejection)"
                        value={comment[a.id] || ''}
                        onChange={(e) => setComment({ ...comment, [a.id]: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button 
                          className="btn flex-1" 
                          onClick={() => approve(a)}
                          style={{ background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(22, 163, 74))' }}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn flex-1" 
                          onClick={() => rejectApproval(a)}
                          style={{ background: 'linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38))' }}
                        >
                          Reject
                        </button>
                      </div>
                      <button 
                        className="btn-secondary text-sm" 
                        onClick={() => {
                          setShowActions({ ...showActions, [a.id]: false });
                          setComment({ ...comment, [a.id]: '' });
                        }}
                      >
                        Cancel
                      </button>
                    </>
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

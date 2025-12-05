'use client';
import useSWR from 'swr';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

export default function ApprovalsPage() {
  const { data, mutate } = useSWR('/api/approvals', fetcher);
  const approve = async (a:any) => {
    const res = await fetch('/api/approvals/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ resourceType:a.resourceType, resourceId:a.resourceId, comment:'OK' }) });
    if (res.status === 401) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) mutate();
    else {
      const errorText = await res.text();
      alert(errorText || 'Failed to approve');
    }
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Approvals</h1>
      <div className="grid gap-3">
        {(data?.list||[]).map((a:any)=>(
          <div key={a.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold">{a.resourceType} #{a.resourceId}</div>
              <div className="text-sm">Action: {a.action} · Status: {a.status}</div>
            </div>
            {a.status==='SUBMITTED' && <button className="btn" onClick={()=>approve(a)}>Approve</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

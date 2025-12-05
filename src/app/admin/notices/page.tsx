'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

export default function NoticesAdminPage() {
  const { data, mutate } = useSWR('/api/admin/notices', fetcher);
  const [form, setForm] = useState({
    title: '',
    bodyHtml: '',
    weekOf: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  });

  const submit = async (e:any) => {
    e.preventDefault();
    if (!form.title.trim() || !form.bodyHtml.trim()) {
      alert('Please fill in all fields');
      return;
    }
    const res = await fetch('/api/admin/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        weekOf: new Date(form.weekOf).toISOString()
      })
    });
    if (res.ok) {
      alert('Notice submitted for approval');
      setForm({ title: '', bodyHtml: '', weekOf: new Date().toISOString().split('T')[0] });
      mutate();
    } else alert(await res.text());
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      'submitted': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'draft': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Manage Notices</h1>
      <form onSubmit={submit} className="card grid gap-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            type="text"
            placeholder="Notice title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Week Of</label>
          <input
            className="input"
            type="date"
            value={form.weekOf}
            onChange={e => setForm({ ...form, weekOf: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Body (HTML)</label>
          <textarea
            className="input"
            rows={6}
            placeholder="Enter HTML content for the notice"
            value={form.bodyHtml}
            onChange={e => setForm({ ...form, bodyHtml: e.target.value })}
          />
        </div>
        <button className="btn w-fit">Submit for Approval</button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-3">All Notices</h2>
        <div className="grid gap-2">
          {(data?.list || []).length === 0 ? (
            <p className="text-gray-500">No notices yet.</p>
          ) : (
            (data?.list || []).map((n: any) => (
              <div key={n.id} className="card flex justify-between items-start">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-sm text-gray-600">Week of {new Date(n.weekOf).toLocaleDateString()}</div>
                </div>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(n.status)}`}>
                  {n.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

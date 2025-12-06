'use client';
import useSWR from 'swr';
import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

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
    if (res.status === 401) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Notice submitted for approval');
      setForm({ title: '', bodyHtml: '', weekOf: new Date().toISOString().split('T')[0] });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to submit notice');
    }
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
          <label className="label">Body Content</label>
          <RichTextEditor
            value={form.bodyHtml}
            onChange={(value) => setForm({ ...form, bodyHtml: value })}
            placeholder="Enter notice content. Use the toolbar to format text with bold, italic, underline, colors, and more..."
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
                <div className="flex-1">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-sm text-gray-600">Week of {new Date(n.weekOf).toLocaleDateString()}</div>
                  {n.status === 'submitted' && (
                    <div className="text-xs text-blue-600 mt-1">
                      ℹ️ This notice is waiting for approval before it will appear on the public notices page
                    </div>
                  )}
                  {n.status === 'published' && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Published and visible on the public notices page
                    </div>
                  )}
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

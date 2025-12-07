'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ProcessesPage() {
  const { data, mutate } = useSWR('/api/admin/processes', fetcher);
  const [form, setForm] = useState({ title: '', contentHtml: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const submit = async (e: any) => {
    e.preventDefault();
    const url = editingId ? `/api/admin/processes/${editingId}` : '/api/admin/processes';
    const method = editingId ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert(editingId ? 'Process updated' : 'Process created');
      setForm({ title: '', contentHtml: '' });
      setEditingId(null);
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to save process');
    }
  };

  const edit = (process: any) => {
    setForm({ title: process.title, contentHtml: process.contentHtml });
    setEditingId(process.id);
  };

  const cancelEdit = () => {
    setForm({ title: '', contentHtml: '' });
    setEditingId(null);
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Process Documents</h1>

      <form onSubmit={submit} className="card grid gap-3">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit Process' : 'Create Process Document'}</h2>
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Content (HTML)</label>
          <textarea 
            className="input" 
            value={form.contentHtml} 
            onChange={e => setForm({ ...form, contentHtml: e.target.value })} 
            rows={10}
            placeholder="Enter HTML content for the process document"
            required
          />
        </div>
        <div className="flex gap-2">
          <button className="btn w-fit" type="submit">{editingId ? 'Update' : 'Create'}</button>
          {editingId && (
            <button className="btn-secondary w-fit" type="button" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-3">All Process Documents</h2>
        <div className="grid gap-2">
          {(data?.list || []).length === 0 ? (
            <p className="text-gray-500">No process documents yet.</p>
          ) : (
            (data?.list || []).map((p: any) => (
              <div key={p.id} className="card flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-gray-600">
                    Version {p.version} · Status: {p.status}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Created: {new Date(p.createdAt).toLocaleDateString()}
                    {p.updatedAt && ` · Updated: ${new Date(p.updatedAt).toLocaleDateString()}`}
                  </div>
                  {p.contentHtml && (
                    <div className="mt-2 text-sm text-gray-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: p.contentHtml.substring(0, 200) + '...' }} />
                  )}
                </div>
                <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => edit(p)}>Edit</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


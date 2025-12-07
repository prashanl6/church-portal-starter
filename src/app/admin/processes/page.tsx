'use client';
import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

export default function ProcessesPage() {
  const [form, setForm] = useState({ title: '', contentHtml: '' });

  const submit = async (e: any) => {
    e.preventDefault();
    if (!form.title.trim() || !form.contentHtml.trim()) {
      alert('Please fill in all fields');
      return;
    }
    
    const res = await fetch('/api/admin/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Process document submitted for approval');
      setForm({ title: '', contentHtml: '' });
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to submit process document');
    }
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Process Documents</h1>

      <form onSubmit={submit} className="card grid gap-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Content</label>
          <RichTextEditor
            value={form.contentHtml}
            onChange={(value) => setForm({ ...form, contentHtml: value })}
            placeholder="Enter process document content. Use the toolbar to format text with bold, italic, underline, colors, and more..."
          />
        </div>
        <button className="btn w-fit" type="submit">Submit for Approval</button>
      </form>
    </div>
  );
}


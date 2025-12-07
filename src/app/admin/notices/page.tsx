'use client';
import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';

export default function NoticesAdminPage() {
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
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to submit notice');
    }
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
    </div>
  );
}

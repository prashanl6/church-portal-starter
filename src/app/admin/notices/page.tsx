'use client';
import { useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import { PageHeader, ADMIN_BACK } from '@/components/ui';

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
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        eyebrow="Notices"
        title="Write a notice"
        subtitle="When you submit, a second administrator checks the notice before it appears on the website."
      />
      <form onSubmit={submit} className="card panel-enter form-grid two">
        <div>
          <label className="label" htmlFor="notice-title">Title</label>
          <input
            id="notice-title"
            className="input"
            type="text"
            placeholder="Notice title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <p className="hint">A short heading, for example “Harvest Festival this Sunday”.</p>
        </div>
        <div>
          <label className="label" htmlFor="notice-week">Week Of</label>
          <input
            id="notice-week"
            className="input"
            type="date"
            value={form.weekOf}
            onChange={e => setForm({ ...form, weekOf: e.target.value })}
          />
          <p className="hint">The week this notice is for.</p>
        </div>
        <div className="span-2">
          <label className="label">Body Content</label>
          <RichTextEditor
            value={form.bodyHtml}
            onChange={(value) => setForm({ ...form, bodyHtml: value })}
            placeholder="Enter notice content. Use the toolbar to format text with bold, italic, underline, colors, and more..."
          />
        </div>
        <div className="span-2">
          <button className="btn">Submit for Approval</button>
        </div>
      </form>
    </div>
  );
}

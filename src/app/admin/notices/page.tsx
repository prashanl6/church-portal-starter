'use client';
import { ask, tell } from '@/components/Dialog';
import { useState } from 'react';
import useSWR from 'swr';
import RichTextEditor from '@/components/RichTextEditor';
import { PageHeader, ADMIN_BACK, DateChip, StatusBadge, longDate } from '@/components/ui';

type NoticeRow = { id: number; title: string; weekOf: string; status: string };
const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : { list: [] }));

export default function NoticesAdminPage() {
  const { data, mutate } = useSWR('/api/admin/notices', fetcher);
  const notices: NoticeRow[] = data?.list || [];

  const requestDelete = async (n: NoticeRow) => {
    if (!await ask(`Ask to remove the notice "${n.title}"? A second administrator must approve before it disappears.`)) return;
    const res = await fetch(`/api/admin/notices/${n.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    tell(res.ok ? 'Removal sent for approval.' : body.error || 'Could not send the removal request.');
    mutate();
  };
  const [form, setForm] = useState({
    title: '',
    bodyHtml: '',
    weekOf: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  });

  const submit = async (e:any) => {
    e.preventDefault();
    if (!form.title.trim() || !form.bodyHtml.trim()) {
      tell('Please fill in all fields');
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
      tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
      return;
    }
    if (res.ok) {
      tell('Notice submitted for approval');
      mutate();
      setForm({ title: '', bodyHtml: '', weekOf: new Date().toISOString().split('T')[0] });
    } else {
      const errorText = await res.text();
      tell(errorText || 'Failed to submit notice');
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

      <section>
        <h2 className="section-label">All notices</h2>
        {notices.length === 0 ? (
          <p className="hint">No notices yet.</p>
        ) : (
          <div className="list-group">
            {notices.map((n) => (
              <div key={n.id} className="list-row" style={{ cursor: 'default' }}>
                <DateChip date={n.weekOf} />
                <span className="list-row-main">
                  <span className="list-row-title">{n.title}</span>
                  <span className="list-row-meta">Week of {longDate(n.weekOf)}</span>
                </span>
                <StatusBadge status={n.status} />
                {n.status === 'published' && (
                  <button type="button" className="btn-quiet danger" onClick={() => requestDelete(n)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

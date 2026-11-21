'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader, ADMIN_BACK, Alert, StatusBadge, longDate } from '@/components/ui';

type Account = { id: number; name: string; email: string; role: string; status: string; createdAt: string };
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AccountsPage() {
  const { data, mutate } = useSWR('/api/admin/users', fetcher);
  const accounts: Account[] = data?.list || [];
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg({ tone: 'success', text: body.message });
      setForm({ name: '', email: '', role: 'staff', password: '' });
      mutate();
    } else {
      setMsg({ tone: 'error', text: body.error || 'Could not send the request.' });
    }
  };

  const switchOff = async (a: Account) => {
    if (!window.confirm(`Switch off ${a.name}'s account? They will no longer be able to log in. A second administrator must approve.`)) return;
    const res = await fetch(`/api/admin/users/${a.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    alert(res.ok ? body.message : body.error || 'Could not send the request.');
    mutate();
  };

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        eyebrow="Accounts"
        title="Staff and administrators"
        subtitle="Administrators make and approve changes. Staff can view everything but cannot change anything. New accounts start working once a second administrator approves them."
      />

      {data?.error && <Alert tone="info">{data.error}</Alert>}

      <section>
        <h2 className="section-label">Current accounts</h2>
        <div className="list-group">
          {accounts.map((a) => (
            <div key={a.id} className="list-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
              <span className="list-row-main">
                <span className="list-row-title">{a.name}</span>
                <span className="list-row-meta" style={{ wordBreak: 'break-all' }}>
                  {a.email} · {a.role === 'admin' ? 'Administrator' : 'Staff'} · since {longDate(a.createdAt)}
                </span>
              </span>
              {a.status === 'active' ? (
                <button type="button" className="btn-quiet danger" onClick={() => switchOff(a)}>
                  Switch off
                </button>
              ) : (
                <StatusBadge status="INACTIVE" />
              )}
            </div>
          ))}
        </div>
        {data?.pending ? (
          <p className="hint">
            {data.pending} account request{data.pending === 1 ? ' is' : 's are'} waiting in <a href="/admin/approvals">Approvals</a>.
          </p>
        ) : null}
      </section>

      <form onSubmit={submit} className="card form-grid two">
        <h2 className="section-label span-2" style={{ margin: 0 }}>Add an account</h2>
        <div>
          <label className="label" htmlFor="acc-name">Full name</label>
          <input id="acc-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="acc-email">Email (used to log in)</label>
          <input id="acc-email" className="input" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="acc-role">Role</label>
          <select id="acc-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff (view only)</option>
            <option value="admin">Administrator (makes and approves changes)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="acc-password">First password</label>
          <input id="acc-password" className="input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <p className="hint">At least 8 characters. Give it to the person privately.</p>
        </div>
        <div className="span-2">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send for approval'}
          </button>
        </div>
        {msg && (
          <div className="span-2">
            <Alert tone={msg.tone}>{msg.text}</Alert>
          </div>
        )}
      </form>
    </div>
  );
}

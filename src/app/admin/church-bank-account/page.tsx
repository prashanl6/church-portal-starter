'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader, ADMIN_BACK, Alert, SkeletonList, longDate } from '@/components/ui';

const fetcher = (url: string) => fetch(url, { credentials: 'same-origin' }).then((r) => r.json());

export default function ChurchBankAccountAdminPage() {
  const { data, mutate, error } = useSWR('/api/admin/church-bank-account', fetcher);
  const [form, setForm] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
    branch: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const live = data?.live;
  const pending = data?.pendingProposal;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/church-bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: 'err', text: body.error || 'Request failed' });
        return;
      }
      setMsg({ type: 'ok', text: body.message || 'Submitted for approval.' });
      setForm({ accountNumber: '', accountName: '', bankName: '', branch: '' });
      await mutate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: '46rem' }}>
      <PageHeader
        back={ADMIN_BACK}
        eyebrow="Settings"
        title="Church bank account"
        subtitle={
          <>
            These details appear in the <strong>Booking approved</strong> email for hall payments. Any change goes to a
            second administrator for approval in the{' '}
            <Link href="/admin/approvals?filter=SUBMITTED">Approvals queue</Link>.
          </>
        }
      />

      {error && <Alert tone="error">Could not load settings. Check you are logged in as admin or staff.</Alert>}
      {!data && !error && <SkeletonList rows={2} height={120} />}

      {live && (
        <section className="card panel-enter">
          <h2 className="section-label">Currently published</h2>
          <dl className="details">
            <div><dt>Account number</dt><dd>{live.accountNumber}</dd></div>
            <div><dt>Account name</dt><dd>{live.accountName}</dd></div>
            <div><dt>Bank</dt><dd>{live.bankName}</dd></div>
            <div><dt>Branch</dt><dd>{live.branch}</dd></div>
          </dl>
          <p className="hint" style={{ marginTop: '0.75rem' }}>
            Last updated {longDate(live.updatedAt)} at{' '}
            {new Date(live.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </section>
      )}

      {data && !live && !pending && (
        <Alert tone="warning">
          No bank details are published yet. Fill in the form below. After a second administrator approves, they will
          appear in booking approval emails.
        </Alert>
      )}

      {pending && (
        <section className="card panel-enter" style={{ background: 'var(--accent-soft)', borderColor: '#d5e0f0' }}>
          <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>Waiting for approval</span>
          <h2 className="section-label" style={{ marginBottom: '0.5rem' }}>A change is waiting</h2>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-2)' }}>
            These new details will be used once another administrator approves them.
          </p>
          <dl className="details" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '0 1rem' }}>
            <div><dt>Account number</dt><dd>{pending.accountNumber}</dd></div>
            <div><dt>Account name</dt><dd>{pending.accountName}</dd></div>
            <div><dt>Bank</dt><dd>{pending.bankName}</dd></div>
            <div><dt>Branch</dt><dd>{pending.branch}</dd></div>
          </dl>
          <Link href="/admin/approvals?filter=SUBMITTED" className="btn-secondary" style={{ marginTop: '1.25rem' }}>
            Open approvals
          </Link>
        </section>
      )}

      <form onSubmit={onSubmit} className="card form-grid two">
        <div className="span-2">
          <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Propose new details</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Account number: <strong>digits only</strong>, no spaces or dashes.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="ba-number">Account number</label>
          <input
            id="ba-number"
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="ba-name">Account name</label>
          <input
            id="ba-name"
            className="input"
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            required
            maxLength={200}
          />
        </div>
        <div>
          <label className="label" htmlFor="ba-bank">Bank</label>
          <input
            id="ba-bank"
            className="input"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            placeholder="e.g. Commercial Bank"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="ba-branch">Branch</label>
          <input
            id="ba-branch"
            className="input"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            placeholder="e.g. Colombo Fort"
            required
          />
        </div>
        <div className="span-2">
          <button type="submit" className="btn" disabled={submitting || !!pending}>
            {pending ? 'Resolve pending approval first' : submitting ? 'Submitting…' : 'Submit for approval'}
          </button>
        </div>
        {msg && (
          <div className="span-2">
            <Alert tone={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</Alert>
          </div>
        )}
      </form>
    </div>
  );
}

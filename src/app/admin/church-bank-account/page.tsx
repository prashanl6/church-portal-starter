'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';

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
    <div className="grid gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Church Bank Account Details</h1>
        <p className="text-sm text-gray-600 mt-2">
          Details shown in the <strong>Booking approved</strong> email for hall payments. Changes are reviewed in the{' '}
          <Link href="/admin/approvals?filter=SUBMITTED" className="text-blue-600 hover:underline">
            Approvals queue
          </Link>{' '}
          (one approver; submitter cannot approve their own submission).
        </p>
      </div>

      {error && (
        <div className="card text-sm text-red-700">Could not load settings. Check you are logged in as admin or staff.</div>
      )}

      {live && (
        <div className="card grid gap-2">
          <h2 className="text-lg font-semibold">Currently published</h2>
          <div className="text-sm space-y-1">
            <div>
              <strong>Account number:</strong> {live.accountNumber}
            </div>
            <div>
              <strong>Account name:</strong> {live.accountName}
            </div>
            <div>
              <strong>Bank:</strong> {live.bankName}
            </div>
            <div>
              <strong>Branch:</strong> {live.branch}
            </div>
            <div className="text-xs text-gray-500">
              Updated {new Date(live.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {!live && !pending && (
        <div className="card text-sm text-amber-800 bg-amber-50 border border-amber-200">
          No bank details are published yet. Submit the form below; after approval, they will appear in booking approval
          emails.
        </div>
      )}

      {pending && (
        <div className="card text-sm text-blue-900 bg-blue-50 border border-blue-200 grid gap-2">
          <div className="font-semibold">Change pending approval</div>
          <p>A proposed update is in the approvals queue, waiting for an approver.</p>
          <div className="text-xs space-y-0.5 font-mono bg-white/60 p-2 rounded">
            <div>Account #: {pending.accountNumber}</div>
            <div>Name: {pending.accountName}</div>
            <div>Bank: {pending.bankName}</div>
            <div>Branch: {pending.branch}</div>
          </div>
          <Link href="/admin/approvals?filter=SUBMITTED" className="btn-secondary w-fit text-center">
            Open approvals
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="card grid gap-3">
        <h2 className="text-lg font-semibold">Propose new details</h2>
        <p className="text-xs text-gray-600">
          Account number: <strong>digits only</strong>. Account name: any text. Bank and branch:{' '}
          <strong>letters and spaces only</strong> (no numbers).
        </p>
        <div className="grid gap-2">
          <label className="label">Account number</label>
          <input
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="label">Account name</label>
          <input
            className="input"
            value={form.accountName}
            onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            required
            maxLength={200}
          />
        </div>
        <div className="grid gap-2">
          <label className="label">Bank</label>
          <input
            className="input"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            placeholder="e.g. Commercial Bank"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="label">Branch</label>
          <input
            className="input"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            placeholder="e.g. Colombo Fort"
            required
          />
        </div>
        <button type="submit" className="btn w-fit" disabled={submitting || !!pending}>
          {pending ? 'Resolve pending approval first' : submitting ? 'Submitting…' : 'Submit for approval'}
        </button>
        {msg && (
          <p className={`text-sm ${msg.type === 'ok' ? 'text-green-800' : 'text-red-700'}`}>{msg.text}</p>
        )}
      </form>

      <Link href="/admin" className="btn-secondary w-fit">
        Back to admin
      </Link>
    </div>
  );
}

'use client';
import { tell, askText } from '@/components/Dialog';
import useSWR from 'swr';
import { useState } from 'react';
import { PageHeader, ADMIN_BACK, EmptyState, SkeletonList, longDate } from '@/components/ui';
import { IconHeart } from '@/components/Icons';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MedicalEquipmentPage() {
  const { data, mutate } = useSWR('/api/admin/medical', fetcher);
  const { data: me } = useSWR('/api/auth/check', fetcher);
  const [form, setForm] = useState({ name: '', quantityTotal: 0, notes: '' });
  const [loanForm, setLoanForm] = useState({ itemId: 0, givenTo: '', dueDate: '' });

  const submitItem = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/medical/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.status === 401 || res.status === 403) {
      tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
      return;
    }
    if (res.ok) {
      tell('Medical item created');
      setForm({ name: '', quantityTotal: 0, notes: '' });
      mutate();
    } else {
      const errorText = await res.text();
      tell(errorText || 'Failed to create item');
    }
  };

  const submitLoan = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/medical/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanForm)
    });
    if (res.status === 401 || res.status === 403) {
      tell('Your session has expired. Please log in again.').then(() => { window.location.href = '/login'; });
      return;
    }
    if (res.ok) {
      tell('Loan request created');
      setLoanForm({ itemId: 0, givenTo: '', dueDate: '' });
      mutate();
    } else {
      const errorText = await res.text();
      tell(errorText || 'Failed to create loan');
    }
  };

  const approveLoan = async (loanId: number) => {
    const res = await fetch(`/api/admin/medical/loans/${loanId}/approve`, { method: 'POST' });
    if (res.ok) {
      mutate();
    } else {
      const body = await res.json().catch(() => ({}));
      tell(body.error || 'Failed to approve loan');
    }
  };

  const issueLoan = async (loanId: number) => {
    const res = await fetch(`/api/admin/medical/loans/${loanId}/issue`, { method: 'POST' });
    if (res.ok) {
      mutate();
    } else {
      const body = await res.json().catch(() => ({}));
      tell(body.error || 'Failed to issue loan');
    }
  };

  const returnLoan = async (loanId: number, condition: string) => {
    const res = await fetch(`/api/admin/medical/loans/${loanId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition })
    });
    if (res.ok) {
      mutate();
    } else {
      const body = await res.json().catch(() => ({}));
      tell(body.error || 'Failed to return loan');
    }
  };

  const loanStatus = (loan: any): [string, string] =>
    loan.returned ? ['Returned', 'badge-green']
    : loan.issuedAt ? ['On loan', 'badge-blue']
    : loan.approvedByAdminId ? ['Approved – ready to hand over', 'badge-blue']
    : ['Waiting for approval', 'badge-amber'];

  const items = data?.items || [];
  const loans = data?.loans || [];

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        title="Medical equipment"
        subtitle="Wheelchairs, walkers and other aids the church lends to members."
      />

      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', alignItems: 'start' }}>
        {/* Create Loan Form */}
        <form onSubmit={submitLoan} className="card">
          <h2 className="section-label">Lend an item</h2>
          <div className="form-grid">
            <div>
              <label className="label" htmlFor="loan-item">Item</label>
              <select id="loan-item" className="input" value={loanForm.itemId} onChange={e => setLoanForm({ ...loanForm, itemId: Number(e.target.value) })} required>
                <option value="0">Select an item</option>
                {items.filter((item: any) => item.quantityAvailable > 0).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.quantityAvailable} available)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="loan-to">Given To</label>
              <input id="loan-to" className="input" value={loanForm.givenTo} onChange={e => setLoanForm({ ...loanForm, givenTo: e.target.value })} placeholder="Full name of the person" required />
            </div>
            <div>
              <label className="label" htmlFor="loan-due">Due Date</label>
              <input id="loan-due" className="input" type="date" value={loanForm.dueDate} onChange={e => setLoanForm({ ...loanForm, dueDate: e.target.value })} />
              <p className="hint">Optional. When the item should come back.</p>
            </div>
          </div>
          <button className="btn" style={{ marginTop: '1.5rem' }}>Create Loan Request</button>
        </form>

        {/* Create Item Form */}
        <form onSubmit={submitItem} className="card admin-only">
          <h2 className="section-label">Add a new item</h2>
          <div className="form-grid">
            <div>
              <label className="label" htmlFor="item-name">Item Name</label>
              <input id="item-name" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="For example: Wheelchair" required />
            </div>
            <div>
              <label className="label" htmlFor="item-qty">Total Quantity</label>
              <input id="item-qty" className="input" type="number" value={form.quantityTotal} onChange={e => setForm({ ...form, quantityTotal: Number(e.target.value) })} required min="1" />
            </div>
            <div>
              <label className="label" htmlFor="item-notes">Notes</label>
              <textarea id="item-notes" className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <button className="btn-secondary" style={{ marginTop: '1.5rem' }}>Create Item</button>
        </form>
      </div>

      {/* Loans List */}
      <section>
        <h2 className="section-label">Loans</h2>
        {!data ? (
          <SkeletonList rows={2} />
        ) : loans.length === 0 ? (
          <EmptyState icon={<IconHeart />} title="No loans yet" text="Items you lend will appear here." />
        ) : (
          <div className="list-group">
            {loans.map((loan: any) => {
              const [label, tone] = loanStatus(loan);
              return (
                <div key={loan.id} className="list-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <div className="list-row-main" style={{ flexBasis: '18rem' }}>
                    <span className="list-row-title">{loan.item.name} – {loan.givenTo}</span>
                    <span className="list-row-meta">
                      Requested {longDate(loan.requestDate)}
                      {loan.issuedAt && ` · Handed over ${longDate(loan.issuedAt)}`}
                    </span>
                    {loan.dueDate && !loan.returned && (
                      <span className="list-row-meta">Due back {longDate(loan.dueDate)}</span>
                    )}
                    {loan.returned && loan.returnedAt && (
                      <span className="list-row-meta">Returned {longDate(loan.returnedAt)}</span>
                    )}
                    {loan.conditionOnReturn && (
                      <span className="list-row-meta">Condition on return: {loan.conditionOnReturn}</span>
                    )}
                  </div>
                  <span className={`badge ${tone}`}>{label}</span>
                  {!loan.approvedByAdminId && loan.givenByUserId !== me?.id && (
                    <button className="btn btn-sm admin-only" onClick={() => approveLoan(loan.id)}>Approve</button>
                  )}
                  {loan.approvedByAdminId && !loan.issuedAt && (
                    <button className="btn btn-sm" onClick={() => issueLoan(loan.id)}>Issue</button>
                  )}
                  {loan.issuedAt && !loan.returned && (
                    <button className="btn-secondary btn-sm" onClick={async () => {
                      const condition = await askText('What condition is it in? (for example: good, needs cleaning)');
                      if (condition !== null) returnLoan(loan.id, condition);
                    }}>Mark Returned</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Items List */}
      <section>
        <h2 className="section-label">Items</h2>
        {!data ? (
          <SkeletonList rows={2} />
        ) : items.length === 0 ? (
          <EmptyState icon={<IconHeart />} title="No medical items yet" text="Add an item using the form above." />
        ) : (
          <div className="list-group">
            {items.map((item: any) => (
              <div key={item.id} className="list-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <div className="list-row-main" style={{ flexBasis: '16rem' }}>
                  <span className="list-row-title">{item.name}</span>
                  {item.notes && <span className="list-row-meta">{item.notes}</span>}
                </div>
                <span className="list-row-meta" style={{ marginTop: 0 }}>
                  <strong style={{ color: 'var(--text)', fontSize: '1.15rem' }}>{item.quantityAvailable}</strong> of {item.quantityTotal} available
                  {item.quantityTotal - item.quantityAvailable > 0 && ` · ${item.quantityTotal - item.quantityAvailable} on loan`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

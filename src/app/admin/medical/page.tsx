'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MedicalEquipmentPage() {
  const { data, mutate } = useSWR('/api/admin/medical', fetcher);
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
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Medical item created');
      setForm({ name: '', quantityTotal: 0, notes: '' });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to create item');
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
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Loan request created');
      setLoanForm({ itemId: 0, givenTo: '', dueDate: '' });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to create loan');
    }
  };

  const approveLoan = async (loanId: number) => {
    const res = await fetch(`/api/admin/medical/loans/${loanId}/approve`, { method: 'POST' });
    if (res.ok) {
      mutate();
    } else {
      alert('Failed to approve loan');
    }
  };

  const issueLoan = async (loanId: number) => {
    const res = await fetch(`/api/admin/medical/loans/${loanId}/issue`, { method: 'POST' });
    if (res.ok) {
      mutate();
    } else {
      alert('Failed to issue loan');
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
      alert('Failed to return loan');
    }
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Medical Equipment</h1>

      {/* Create Item Form */}
      <form onSubmit={submitItem} className="card grid gap-3">
        <h2 className="text-lg font-semibold">Add Medical Item</h2>
        <div>
          <label className="label">Item Name</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Total Quantity</label>
          <input className="input" type="number" value={form.quantityTotal} onChange={e => setForm({ ...form, quantityTotal: Number(e.target.value) })} required min="1" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
        <button className="btn w-fit">Create Item</button>
      </form>

      {/* Create Loan Form */}
      <form onSubmit={submitLoan} className="card grid gap-3">
        <h2 className="text-lg font-semibold">Create Loan Request</h2>
        <div>
          <label className="label">Item</label>
          <select className="input" value={loanForm.itemId} onChange={e => setLoanForm({ ...loanForm, itemId: Number(e.target.value) })} required>
            <option value="0">Select an item</option>
            {(data?.items || []).filter((item: any) => item.quantityAvailable > 0).map((item: any) => (
              <option key={item.id} value={item.id}>{item.name} ({item.quantityAvailable} available)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Given To</label>
          <input className="input" value={loanForm.givenTo} onChange={e => setLoanForm({ ...loanForm, givenTo: e.target.value })} required />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input className="input" type="date" value={loanForm.dueDate} onChange={e => setLoanForm({ ...loanForm, dueDate: e.target.value })} />
        </div>
        <button className="btn w-fit">Create Loan Request</button>
      </form>

      {/* Items List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Medical Items</h2>
        <div className="grid gap-2">
          {(data?.items || []).length === 0 ? (
            <p className="text-gray-500">No medical items yet.</p>
          ) : (
            (data?.items || []).map((item: any) => (
              <div key={item.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      Total: {item.quantityTotal} · Available: {item.quantityAvailable} · Loaned: {item.quantityTotal - item.quantityAvailable}
                    </div>
                    {item.notes && <div className="text-sm text-gray-500 mt-1">{item.notes}</div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Loans List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Loans</h2>
        <div className="grid gap-2">
          {(data?.loans || []).length === 0 ? (
            <p className="text-gray-500">No loans yet.</p>
          ) : (
            (data?.loans || []).map((loan: any) => (
              <div key={loan.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{loan.item.name} → {loan.givenTo}</div>
                    <div className="text-sm text-gray-600">
                      Requested: {new Date(loan.requestDate).toLocaleDateString()}
                      {loan.approvedAt && ` · Approved: ${new Date(loan.approvedAt).toLocaleDateString()}`}
                      {loan.issuedAt && ` · Issued: ${new Date(loan.issuedAt).toLocaleDateString()}`}
                      {loan.dueDate && ` · Due: ${new Date(loan.dueDate).toLocaleDateString()}`}
                      {loan.returned && loan.returnedAt && ` · Returned: ${new Date(loan.returnedAt).toLocaleDateString()}`}
                    </div>
                    {loan.conditionOnReturn && (
                      <div className="text-sm text-gray-500 mt-1">Condition on return: {loan.conditionOnReturn}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!loan.approvedByAdminId && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => approveLoan(loan.id)}>Approve</button>
                    )}
                    {loan.approvedByAdminId && !loan.issuedAt && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => issueLoan(loan.id)}>Issue</button>
                    )}
                    {loan.issuedAt && !loan.returned && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => {
                        const condition = prompt('Condition on return:');
                        if (condition !== null) returnLoan(loan.id, condition);
                      }}>Mark Returned</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


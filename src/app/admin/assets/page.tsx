'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

export default function AssetsPage() {
  const { data, mutate } = useSWR('/api/admin/assets', fetcher);
  const [form, setForm] = useState({ reference:'', value:0, quantity:0, labelCategory:'chapel', notes:'' });

  const submit = async (e:any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) { 
      alert('Asset created and submitted for approval'); 
      mutate(); 
    } else {
      let errorMsg = 'Failed to submit';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        try {
          errorMsg = await res.text() || errorMsg;
        } catch {
          // Use default
        }
      }
      alert(errorMsg);
    }
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Assets</h1>
      <form onSubmit={submit} className="card grid gap-2">
        <div><label className="label">Reference</label><input className="input" value={form.reference} onChange={e=>setForm({...form, reference:e.target.value})}/></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">Value</label><input className="input" type="number" value={form.value} onChange={e=>setForm({...form, value:Number(e.target.value)})}/></div>
          <div><label className="label">Quantity</label><input className="input" type="number" value={form.quantity} onChange={e=>setForm({...form, quantity:Number(e.target.value)})}/></div>
          <div><label className="label">Category</label><select className="input" value={form.labelCategory} onChange={e=>setForm({...form, labelCategory:e.target.value})}><option>chapel</option><option>hall</option></select></div>
        </div>
        <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/></div>
        <button className="btn w-fit">Save (needs approval)</button>
      </form>
      <div className="grid gap-2">
        {(data?.list||[]).map((a:any)=>(<div key={a.id} className="card"><div className="font-semibold">{a.reference}</div><div className="text-sm">Qty {a.quantity} · LKR {a.value} · {a.labelCategory}</div></div>))}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';

export default function BookHallPage() {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', purpose:'', date:'', startTime:'', endTime:'', hall:'Main Hall', notes:'' });
  const [msg, setMsg] = useState('');
  const [booked, setBooked] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/bookings/availability');
      const data = await res.json();
      setBooked(data.booked || []);
    })();
  }, []);

  const submit = async (e:any) => {
    e.preventDefault();
    const res = await fetch('/api/bookings/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
    if (res.ok) setMsg('Request submitted. You will receive an email if approved.');
    else setMsg('Could not submit request');
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Book the Hall</h1>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Availability (booked dates)</h2>
        <ul className="list-disc pl-5">{booked.map((b,i)=>(<li key={i}>{new Date(b.date).toDateString()} {b.startTime}-{b.endTime}</li>))}</ul>
      </div>
      <form onSubmit={submit} className="card grid gap-3">
        <div className="grid gap-2">
          <label className="label">Full Name</label>
          <input className="input" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} />
        </div>
        <div className="grid gap-2">
          <label className="label">Email</label>
          <input className="input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        </div>
        <div className="grid gap-2">
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
        </div>
        <div className="grid gap-2">
          <label className="label">Purpose</label>
          <input className="input" value={form.purpose} onChange={e=>setForm({...form, purpose:e.target.value})} required />
        </div>
        <div className="grid gap-2">
          <label className="label">Hall</label>
          <select className="input" value={form.hall} onChange={e=>setForm({...form, hall:e.target.value})}>
            <option>Main Hall</option>
            <option>Chapel</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
          <div><label className="label">Start</label><input type="time" className="input" value={form.startTime} onChange={e=>setForm({...form, startTime:e.target.value})} /></div>
          <div><label className="label">End</label><input type="time" className="input" value={form.endTime} onChange={e=>setForm({...form, endTime:e.target.value})} /></div>
        </div>
        <button className="btn w-fit">Submit Request</button>
        <p>{msg}</p>
      </form>
    </div>
  );
}

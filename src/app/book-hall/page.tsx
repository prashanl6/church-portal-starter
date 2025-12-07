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
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Book the Hall</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>
          Reserve the hall or chapel for your events and gatherings
        </p>
      </div>
      <div className="card">
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'rgb(15, 23, 42)'
        }}>
          📅 Availability (booked dates)
        </h2>
        {booked.length === 0 ? (
          <p style={{ color: 'rgb(100, 116, 139)', margin: 0 }}>
            No confirmed bookings scheduled
          </p>
        ) : (
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {booked
              .filter((b) => {
                // Filter out past dates on client side as well (in case of timezone issues)
                const bookingDate = new Date(b.date);
                return bookingDate >= new Date();
              })
              .map((b, i) => (
                <li 
                  key={i}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgb(248, 250, 252)',
                    borderRadius: '0.5rem',
                    border: '1px solid rgb(226, 232, 240)'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {new Date(b.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span style={{ color: 'rgb(71, 85, 105)', marginLeft: '0.5rem' }}>
                    {b.startTime} - {b.endTime}
                  </span>
                  {b.hall && (
                    <span style={{ color: 'rgb(100, 116, 139)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                      ({b.hall})
                    </span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: '1.5rem' }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          marginBottom: '0.5rem',
          color: 'rgb(15, 23, 42)'
        }}>
          📝 Booking Request
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label className="label">Full Name</label>
            <input className="input" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} />
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label className="label">Phone</label>
            <input type="tel" className="input" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label className="label">Purpose</label>
            <input className="input" value={form.purpose} onChange={e=>setForm({...form, purpose:e.target.value})} required />
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label className="label">Hall</label>
            <select className="input" value={form.hall} onChange={e=>setForm({...form, hall:e.target.value})}>
              <option>Main Hall</option>
              <option>Chapel</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime} onChange={e=>setForm({...form, startTime:e.target.value})} />
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.endTime} onChange={e=>setForm({...form, endTime:e.target.value})} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-primary" style={{ width: 'fit-content' }}>Submit Request</button>
          {msg && (
            <p style={{ 
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: msg.includes('submitted') ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
              color: msg.includes('submitted') ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)',
              margin: 0,
              fontSize: '0.875rem'
            }}>
              {msg}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

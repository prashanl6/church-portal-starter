'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PeopleEventsPage() {
  const { data, mutate } = useSWR('/api/admin/people', fetcher);
  const [form, setForm] = useState({ personName: '', type: 'birthday', date: '', email: '', phone: '', notes: '' });

  const submit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/admin/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        date: new Date(form.date).toISOString()
      })
    });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('People event created');
      setForm({ personName: '', type: 'birthday', date: '', email: '', phone: '', notes: '' });
      mutate();
    } else {
      const errorText = await res.text();
      alert(errorText || 'Failed to create event');
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const res = await fetch(`/api/admin/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
    });
    if (res.ok) {
      mutate();
    } else {
      alert('Failed to update status');
    }
  };

  const upcomingBirthdays = (data?.list || []).filter((e: any) => {
    if (e.type !== 'birthday' || e.status !== 'active') return false;
    const eventDate = new Date(e.date);
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
    return (thisYear >= today && thisYear <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) ||
           (nextYear >= today && nextYear <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingAnniversaries = (data?.list || []).filter((e: any) => {
    if (e.type !== 'wedding_anniversary' || e.status !== 'active') return false;
    const eventDate = new Date(e.date);
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
    return (thisYear >= today && thisYear <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) ||
           (nextYear >= today && nextYear <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Birthdays & Anniversaries</h1>

      <form onSubmit={submit} className="card grid gap-3">
        <h2 className="text-lg font-semibold">Add People Event</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Person Name</label>
            <input className="input" value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="birthday">Birthday</option>
              <option value="wedding_anniversary">Wedding Anniversary</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Email (optional)</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
        <button className="btn w-fit">Create Event</button>
      </form>

      {(upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upcoming (Next 30 Days)</h2>
          <div className="grid gap-2">
            {upcomingBirthdays.map((e: any) => (
              <div key={e.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">🎂 {e.personName} - Birthday</div>
                    <div className="text-sm text-gray-600">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      {e.email && ` · ${e.email}`}
                      {e.phone && ` · ${e.phone}`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
            {upcomingAnniversaries.map((e: any) => (
              <div key={e.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">💒 {e.personName} - Wedding Anniversary</div>
                    <div className="text-sm text-gray-600">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      {e.email && ` · ${e.email}`}
                      {e.phone && ` · ${e.phone}`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">All Events</h2>
        <div className="grid gap-2">
          {(data?.list || []).length === 0 ? (
            <p className="text-gray-500">No events yet.</p>
          ) : (
            (data?.list || []).map((e: any) => (
              <div key={e.id} className="card flex justify-between items-start">
                <div>
                  <div className="font-semibold">
                    {e.type === 'birthday' ? '🎂' : '💒'} {e.personName} - {e.type === 'birthday' ? 'Birthday' : 'Wedding Anniversary'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {e.email && ` · ${e.email}`}
                    {e.phone && ` · ${e.phone}`}
                  </div>
                  {e.notes && <div className="text-sm text-gray-500 mt-1">{e.notes}</div>}
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-1 rounded text-sm ${e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {e.status}
                  </span>
                  <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => toggleStatus(e.id, e.status)}>
                    {e.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


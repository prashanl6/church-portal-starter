"use client";
import { useState, useMemo } from 'react';

export default function AdminSermonsPage() {
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [theme, setTheme] = useState('');
  const [link, setLink] = useState('');
  const [weekOf, setWeekOf] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // generate last 520 Sundays (about 10 years)
  const sundays = useMemo(() => {
    const list: string[] = [];
    const today = new Date();
    // find most recent past Sunday (including today if today is Sunday)
    const day = today.getDay();
    const daysToLastSunday = day === 0 ? 0 : day;
    const base = new Date(today);
    base.setDate(base.getDate() - daysToLastSunday);
    for (let i = 0; i < 520; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i * 7);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!title || !speaker || !link || !weekOf) {
      setMsg('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, speaker, theme, link, date: weekOf, dateIso: weekOf })
      });
      if (res.status === 401 || res.status === 403) {
        let errorMsg = 'Your session has expired. Please log in again.';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // If not JSON, use default message
        }
        setMsg(errorMsg);
        setTimeout(() => window.location.href = '/login', 2000);
        return;
      }
      if (!res.ok) {
        let errorMsg = 'Failed to submit sermon';
        const contentType = res.headers.get('content-type') || '';
        
        // Check if we got HTML (404 page) instead of JSON
        if (contentType.includes('text/html')) {
          errorMsg = 'API route not found. Please restart the development server.';
          console.error('Received HTML instead of JSON. This usually means the API route is not being recognized.');
        } else if (contentType.includes('application/json')) {
          try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
          } catch {
            // Fallback to default
          }
        } else {
          try {
            const text = await res.text();
            // If it looks like HTML, it's probably a 404 page
            if (text.trim().startsWith('<!DOCTYPE') || text.includes('404')) {
              errorMsg = 'API route not found. Please restart the development server.';
            } else {
              errorMsg = text || errorMsg;
            }
          } catch {
            // Fallback to default
          }
        }
        throw new Error(errorMsg);
      }
      const body = await res.json();
      setMsg('Sermon submitted for approval');
      setTitle(''); setSpeaker(''); setTheme(''); setLink(''); setWeekOf('');
    } catch (err: any) {
      setMsg('Error: ' + (err.message || String(err)));
    } finally { setLoading(false); }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Admin — Sermons</h1>
      <form onSubmit={handleSubmit} className="grid gap-3 max-w-lg">
        <label className="flex flex-col"><span>Title</span><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="flex flex-col"><span>Speaker</span><input className="input" value={speaker} onChange={e => setSpeaker(e.target.value)} /></label>
        <label className="flex flex-col"><span>Theme</span><input className="input" value={theme} onChange={e => setTheme(e.target.value)} /></label>
        <label className="flex flex-col"><span>Facebook Link</span><input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://www.facebook.com/..." /></label>
        <label className="flex flex-col"><span>Week Of (past Sundays only)</span>
          <select className="input" value={weekOf} onChange={e => setWeekOf(e.target.value)}>
            <option value="">Select a Sunday</option>
            {sundays.map(d => (
              <option key={d} value={d}>{new Date(d).toDateString()}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit for Approval'}</button>
          <button type="button" className="btn-secondary" onClick={() => { setTitle(''); setSpeaker(''); setTheme(''); setLink(''); setWeekOf(''); setMsg(''); }}>Reset</button>
        </div>
        {msg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            backgroundColor: msg.includes('submitted') ? 'rgb(220, 252, 231)' : msg.includes('expired') || msg.includes('log in') ? 'rgb(254, 242, 242)' : 'rgb(254, 242, 242)',
            color: msg.includes('submitted') ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)',
            border: `1px solid ${msg.includes('submitted') ? 'rgb(187, 247, 208)' : 'rgb(254, 205, 211)'}`
          }}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}

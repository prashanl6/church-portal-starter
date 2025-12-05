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
      if (!res.ok) throw new Error(await res.text());
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
        {msg && <div className="text-sm text-muted">{msg}</div>}
      </form>
    </div>
  );
}

"use client";
import { useState, useMemo } from 'react';
import { PageHeader, ADMIN_BACK, Alert } from '@/components/ui';

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
    // Set to start of today (midnight) in local timezone to avoid timezone issues
    today.setHours(0, 0, 0, 0);
    
    // find most recent past Sunday (including today if today is Sunday)
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // If today is Sunday (0), we want today. Otherwise, go back to the previous Sunday
    const daysToLastSunday = day === 0 ? 0 : day;
    
    // Start from the most recent Sunday
    const base = new Date(today);
    base.setDate(base.getDate() - daysToLastSunday);
    
    // Double-check: ensure base is actually a Sunday
    if (base.getDay() !== 0) {
      // If somehow it's not Sunday, adjust to the previous Sunday
      const currentDay = base.getDay();
      base.setDate(base.getDate() - currentDay);
    }
    
    // Generate 520 Sundays going backwards
    for (let i = 0; i < 520; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - (i * 7));
      d.setHours(0, 0, 0, 0); // Ensure midnight local time
      
      // Format as YYYY-MM-DD in local timezone
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayOfMonth}`;
      
      // Verify this is actually a Sunday before adding
      if (d.getDay() === 0) {
        list.push(dateStr);
      }
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
        credentials: 'include',
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

  const reset = () => { setTitle(''); setSpeaker(''); setTheme(''); setLink(''); setWeekOf(''); setMsg(''); };

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        eyebrow="Sermons"
        title="Add a sermon"
        subtitle="When you submit, a second administrator checks the sermon before it appears on the website."
      />
      <form onSubmit={handleSubmit} className="card panel-enter form-grid two">
        <div>
          <label className="label" htmlFor="s-title">Title</label>
          <input id="s-title" className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="s-speaker">Speaker</label>
          <input id="s-speaker" className="input" value={speaker} onChange={e => setSpeaker(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="s-theme">Theme</label>
          <input id="s-theme" className="input" value={theme} onChange={e => setTheme(e.target.value)} />
          <p className="hint">Optional.</p>
        </div>
        <div>
          <label className="label" htmlFor="s-week">Week Of (past Sundays only)</label>
          <select id="s-week" className="input" value={weekOf} onChange={e => setWeekOf(e.target.value)}>
            <option value="">Select a Sunday</option>
            {sundays.map(d => {
              // Parse the date string and create a date in local timezone
              const date = new Date(d + 'T00:00:00');
              const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
              const dateStr = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
              return (
                <option key={d} value={d}>{dayName}, {dateStr}</option>
              );
            })}
          </select>
        </div>
        <div className="span-2">
          <label className="label" htmlFor="s-link">Facebook Link</label>
          <input id="s-link" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://www.facebook.com/..." />
          <p className="hint">Open the video on Facebook, copy the address from the browser bar and paste it here.</p>
        </div>
        <div className="span-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit for Approval'}</button>
          <button type="button" className="btn-secondary" onClick={reset}>Reset</button>
        </div>
        {msg && (
          <div className="span-2">
            <Alert tone={msg.includes('submitted') ? 'success' : 'error'}>{msg}</Alert>
          </div>
        )}
      </form>
    </div>
  );
}

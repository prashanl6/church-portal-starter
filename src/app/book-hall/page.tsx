'use client';
import { useState, useEffect, useMemo } from 'react';
import { computeHallBookingCharge } from '@/lib/hallBookingPricing';
import { PageHeader, Alert, DateChip, longDate } from '@/components/ui';
import { IconCalendar } from '@/components/Icons';

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BookHallPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    purpose: '',
    date: '',
    startTime: '',
    endTime: '',
    hall: 'Main Hall',
    notes: ''
  });
  const [msg, setMsg] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [booked, setBooked] = useState<any[]>([]);
  const [ratePer30Minutes, setRatePer30Minutes] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/bookings/availability');
      const data = await res.json();
      setBooked(data.booked || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/bookings/pricing');
      const data = await res.json();
      if (typeof data.ratePer30Minutes === 'number' && Number.isFinite(data.ratePer30Minutes)) {
        setRatePer30Minutes(data.ratePer30Minutes);
      }
    })();
  }, []);

  const quote = useMemo(
    () => computeHallBookingCharge(form.startTime, form.endTime, ratePer30Minutes),
    [form.startTime, form.endTime, ratePer30Minutes]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.purpose?.trim() || !form.date || !form.startTime || !form.endTime) {
      setMsg('Please fill in purpose, date, start time, and end time.');
      return;
    }
    if (!quote.ok) {
      setMsg(quote.error);
      return;
    }
    const fmt = (n: number) =>
      n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const confirmMsg =
      quote.total > 0
        ? `Submit this booking request?\n\nEstimated hall hire: LKR ${fmt(quote.total)} (${quote.slots} × 30 min block${quote.slots !== 1 ? 's' : ''} at LKR ${fmt(ratePer30Minutes)} each)\n\nYou will still need admin approval before payment.`
        : 'Submit this booking request? (No hall hire rate is configured yet — amount may be zero.)';
    if (!window.confirm(confirmMsg)) return;
    setBookingRef('');

    const res = await fetch('/api/bookings/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    let data: { error?: string; bookingRef?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    if (res.ok) {
      setBookingRef(data.bookingRef || '');
      setMsg('Request submitted.');
    } else {
      setMsg(typeof data.error === 'string' ? data.error : 'Could not submit request');
    }
  };

  const upcoming = booked.filter((b) => new Date(b.date) >= new Date());
  const submitted = msg.includes('submitted');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Main Hall and Chapel"
        title="Book the hall"
        subtitle="Send a request for the Main Hall or Chapel. An administrator will reply by email once it is approved."
      />

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', alignItems: 'start' }}>
        <form onSubmit={submit} className="card stack" style={{ gap: '1.75rem', gridColumn: 'span 1' }}>
          <Alert tone="info">
            The hall can be booked between <strong>8:00 a.m. and 10:00 p.m.</strong> Hire is charged in{' '}
            <strong>30-minute blocks</strong>; part of a block counts as a full block.
          </Alert>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend className="section-label">1. Your details</legend>
            <div className="form-grid two">
              <div className="span-2">
                <label className="label" htmlFor="bk-name">Full Name</label>
                <input id="bk-name" className="input" autoComplete="name" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="bk-email">Email</label>
                <input id="bk-email" type="email" className="input" autoComplete="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <p className="hint">We send your approval and payment details here.</p>
              </div>
              <div>
                <label className="label" htmlFor="bk-phone">Phone</label>
                <input id="bk-phone" type="tel" className="input" autoComplete="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="span-2">
                <label className="label" htmlFor="bk-purpose">Purpose</label>
                <input id="bk-purpose" className="input" placeholder="For example: birthday lunch, choir practice" value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
              </div>
            </div>
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend className="section-label">2. Date and time</legend>
            <div className="form-grid two">
              <div className="span-2">
                <label className="label" htmlFor="bk-date">Date</label>
                <input id="bk-date" type="date" className="input" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
                {form.date && <p className="hint">{longDate(form.date + 'T00:00:00')}</p>}
              </div>
              <div>
                <label className="label" htmlFor="bk-start">Start Time</label>
                <input id="bk-start" type="time" className="input" min="08:00" max="22:00" value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="bk-end">End Time</label>
                <input id="bk-end" type="time" className="input" min="08:00" max="22:00" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend className="section-label">3. Hall</legend>
            <div>
              <label className="label" htmlFor="bk-hall">Hall</label>
              <select id="bk-hall" className="input" value={form.hall} onChange={(e) => setForm({ ...form, hall: e.target.value })}>
                <option>Main Hall</option>
                <option>Chapel</option>
              </select>
            </div>
          </fieldset>

          <div
            style={{
              padding: '1.25rem 1.4rem',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
            }}
            aria-live="polite"
          >
            <div style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: '0.35rem' }}>Estimated hall hire</div>
            {ratePer30Minutes <= 0 ? (
              <p style={{ margin: 0, color: 'var(--text-2)' }}>
                The church has not set a rate yet. You can still send your request; an administrator will confirm any fees.
              </p>
            ) : !form.startTime || !form.endTime ? (
              <p style={{ margin: 0, color: 'var(--text-2)' }}>Choose a start and end time to see the total.</p>
            ) : !quote.ok ? (
              <p style={{ margin: 0, color: 'var(--danger)' }}>{quote.error}</p>
            ) : (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>
                  LKR {money(quote.total)}
                </div>
                <div style={{ marginTop: '0.25rem', color: 'var(--text-2)' }}>
                  {quote.slots} block{quote.slots !== 1 ? 's' : ''} of 30 minutes × LKR {money(ratePer30Minutes)}
                </div>
              </div>
            )}
            <p className="hint" style={{ marginBottom: 0 }}>This is an estimate until your booking is approved.</p>
          </div>

          <div className="stack-sm">
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Submit Request
            </button>
            {msg && (
              <Alert tone={submitted ? 'success' : 'error'}>
                {msg}
                {submitted && bookingRef && (
                  <>
                    {' '}Your booking reference is <strong>{bookingRef}</strong>. Keep this page to check your
                    booking and pay once it is approved:{' '}
                    <a href={`/booking/${bookingRef}`} style={{ fontWeight: 600 }}>
                      Open my booking
                    </a>
                  </>
                )}
              </Alert>
            )}
          </div>
        </form>

        <aside className="card" style={{ position: 'sticky', top: '6rem' }}>
          <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Already booked</h2>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-2)' }}>
            Please choose a time that does not overlap these bookings.
          </p>
          {upcoming.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-2)' }}>
              <span className="tile-icon" style={{ background: 'var(--success-soft)', color: '#2f6b47', marginBottom: 0 }}>
                <IconCalendar />
              </span>
              No upcoming bookings. Every date is free.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.9rem' }}>
              {upcoming.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                  <DateChip date={b.date} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{longDate(b.date)}</div>
                    <div style={{ color: 'var(--text-2)' }}>
                      {b.startTime} – {b.endTime}
                      {b.hall ? ` · ${b.hall}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

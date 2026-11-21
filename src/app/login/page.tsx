'use client';
import { useState, useEffect } from 'react';
import { IconCross } from '@/components/Icons';

// Demo accounts are pre-filled only on a developer's machine, never on the live site.
const DEV = process.env.NODE_ENV !== 'production';

export default function LoginPage() {
  const [email, setEmail] = useState(DEV ? 'admin1@example.com' : '');
  const [password, setPassword] = useState(DEV ? 'Admin@123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgDetail, setMsgDetail] = useState('');

  const [bootstrapEligible, setBootstrapEligible] = useState(false);
  const [adminsNeeded, setAdminsNeeded] = useState(2);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapName, setBootstrapName] = useState('');
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapMsg, setBootstrapMsg] = useState('');
  const [bootstrapBusy, setBootstrapBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/bootstrap-eligible');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data.adminsNeeded === 'number') setAdminsNeeded(data.adminsNeeded);
        if (!cancelled && data.eligible === true) {
          setBootstrapEligible(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgDetail('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setMsg('Logged in. Taking you to the admin area…');
      const next = new URLSearchParams(window.location.search).get('next') || '';
      window.location.href = next.startsWith('/admin') ? next : '/admin';
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(typeof data.message === 'string' ? data.message : 'The email or password is not correct. Please try again.');
    }
  };

  const onBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapMsg('');
    setBootstrapBusy(true);
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: bootstrapSecret,
          name: bootstrapName,
          email: bootstrapEmail.trim(),
          password: bootstrapPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const left = adminsNeeded - 1;
        setAdminsNeeded(left);
        setBootstrapEmail('');
        setBootstrapPassword('');
        setBootstrapName('');
        setBootstrapMsg(
          left > 0
            ? 'Administrator created. Now create the second administrator (a different person): every change needs a second admin to approve it.'
            : 'Both administrators are ready. Log in below.'
        );
        if (left <= 0) {
          setEmail((data as { email?: string }).email || '');
          setPassword('');
        }
      } else {
        setBootstrapMsg(typeof data.error === 'string' ? data.error : 'Setup failed');
      }
    } catch {
      setBootstrapMsg('Setup failed');
    } finally {
      setBootstrapBusy(false);
    }
  };

  const infoStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: 'var(--text-2)',
    lineHeight: 1.55,
    marginBottom: '1rem',
    padding: '0.9rem 1rem',
    background: 'var(--bg)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)',
  };

  return (
    <div style={{ maxWidth: '30rem', marginLeft: 'auto', marginRight: 'auto', paddingTop: '1.5rem' }}>
      {bootstrapEligible && adminsNeeded <= 0 && bootstrapMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>{bootstrapMsg}</div>
      )}
      {bootstrapEligible && adminsNeeded > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem' }}>
            First-time setup
          </h2>
          <p style={{ ...infoStyle, marginTop: 0 }}>
            This new site needs <strong>two administrators</strong>, because every change is approved by a second
            person. {adminsNeeded === 2 ? 'Create the first one here, then the second.' : 'Now create the second one.'}{' '}
            You need the <strong>BOOTSTRAP_ADMIN_SECRET</strong> value from Vercel. Staff accounts are added later
            under Admin → Accounts.
          </p>
          <form onSubmit={onBootstrap} style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="login-field-1">Bootstrap secret (same as in Vercel env)</label>
              <input id="login-field-1"
                className="input"
                type="password"
                autoComplete="off"
                value={bootstrapSecret}
                onChange={(e) => setBootstrapSecret(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="login-field-2">Your name</label>
              <input id="login-field-2" className="input" value={bootstrapName} onChange={(e) => setBootstrapName(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="login-field-3">Email (login)</label>
              <input id="login-field-3"
                className="input"
                type="email"
                autoComplete="email"
                value={bootstrapEmail}
                onChange={(e) => setBootstrapEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="login-field-4">Password (min. 8 characters)</label>
              <input id="login-field-4"
                className="input"
                type="password"
                autoComplete="new-password"
                value={bootstrapPassword}
                onChange={(e) => setBootstrapPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button className="btn" type="submit" disabled={bootstrapBusy}>
              {bootstrapBusy ? 'Creating…' : 'Create administrator'}
            </button>
          </form>
          {bootstrapMsg && (
            <p
              style={{
                marginTop: '1rem',
                marginBottom: 0,
                padding: '0.75rem',
                backgroundColor: bootstrapMsg.toLowerCase().includes('fail') ? 'rgb(254, 242, 242)' : 'rgb(240, 253, 244)',
                color: bootstrapMsg.toLowerCase().includes('fail') ? 'rgb(127, 29, 29)' : 'rgb(22, 101, 52)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                border: `1px solid ${bootstrapMsg.toLowerCase().includes('fail') ? 'rgb(254, 205, 211)' : 'rgb(187, 247, 208)'}`,
              }}
            >
              {bootstrapMsg}
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span
            className="brand-mark"
            style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 1.1rem', animation: 'fadeInUp 1s var(--ease) both' }}
          >
            <IconCross size={30} />
          </span>
          <h1 className="page-title" style={{ fontSize: '2rem', margin: '0 0 0.4rem' }}>Staff login</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>For church administrators and staff.</p>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '1.1rem' }}>
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="login-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '3.5rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  width: '44px',
                  height: '44px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-3)',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L3.596 3.039m7.753 7.753l6.364 6.364"
                    />
                  </svg>
                ) : (
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: '0.5rem', width: '100%' }}>
            Log in
          </button>
          {msg && (
            <div
              role="alert"
              style={{
                padding: '0.9rem 1rem',
                backgroundColor: msg.includes('Logged') ? 'var(--success-soft)' : 'var(--danger-soft)',
                color: msg.includes('Logged') ? 'rgb(22, 101, 52)' : 'rgb(127, 29, 29)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
                animation: 'fadeInUp 0.5s var(--ease) both',
                border: `1px solid ${msg.includes('Logged') ? 'rgb(187, 247, 208)' : 'rgb(254, 205, 211)'}`,
              }}
            >
              <p style={{ margin: 0 }}>{msg}</p>
              {msgDetail ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', opacity: 0.95 }}>{msgDetail}</p>
              ) : null}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

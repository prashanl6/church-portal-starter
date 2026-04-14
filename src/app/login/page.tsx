'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin1@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgDetail, setMsgDetail] = useState('');

  const [bootstrapEligible, setBootstrapEligible] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapName, setBootstrapName] = useState('Administrator');
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
      setMsg('Logged in. Go to Admin → Approvals.');
      window.location.href = '/admin';
    } else {
      setMsg('Invalid email or password.');
      setMsgDetail(
        'Demo accounts (e.g. admin1@example.com) only exist if this database was seeded. ' +
          'A fresh Vercel deploy usually has no users — use First-time setup below (if shown), run `npx prisma db seed` ' +
          'with your production DATABASE_URL, or see HOSTING_AND_OPERATIONS.md.'
      );
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
        setBootstrapEligible(false);
        setBootstrapMsg('Administrator account created. Sign in below with that email and password.');
        setEmail((data as { email?: string }).email || bootstrapEmail.trim());
        setPassword('');
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
    fontSize: '0.8125rem',
    color: 'rgb(100, 116, 139)',
    lineHeight: 1.5,
    marginBottom: '1rem',
    padding: '0.75rem',
    background: 'rgb(248, 250, 252)',
    borderRadius: '0.5rem',
    border: '1px solid rgb(226, 232, 240)',
  };

  return (
    <div style={{ maxWidth: '28rem', marginLeft: 'auto', marginRight: 'auto' }}>
      {bootstrapEligible && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem' }}>
            First-time setup
          </h2>
          <p style={{ ...infoStyle, marginTop: 0 }}>
            No staff accounts exist yet and <strong>BOOTSTRAP_ADMIN_SECRET</strong> is set in this environment. Create
            the first administrator here, then remove that env variable from Vercel and redeploy.
          </p>
          <form onSubmit={onBootstrap} style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="label">Bootstrap secret (same as in Vercel env)</label>
              <input
                className="input"
                type="password"
                autoComplete="off"
                value={bootstrapSecret}
                onChange={(e) => setBootstrapSecret(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Your name</label>
              <input className="input" value={bootstrapName} onChange={(e) => setBootstrapName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Email (login)</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={bootstrapEmail}
                onChange={(e) => setBootstrapEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password (min. 8 characters)</label>
              <input
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

      <div className="card">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>Staff Login</h1>
        <p style={infoStyle}>
          After a new deployment, the database often has <strong>no users</strong> until you seed it or complete
          first-time setup. The prefilled demo email/password only work if that database was seeded.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgb(100, 116, 139)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgb(37, 99, 235)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgb(100, 116, 139)';
                }}
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
          <button className="btn" type="submit" style={{ marginTop: '0.5rem' }}>
            Login
          </button>
          {msg && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: msg.includes('Logged') ? 'rgb(240, 253, 244)' : 'rgb(254, 242, 242)',
                color: msg.includes('Logged') ? 'rgb(22, 101, 52)' : 'rgb(127, 29, 29)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
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

'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin1@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');

  const onSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) });
    if (res.ok) {
      setMsg('Logged in. Go to Admin → Approvals.');
      window.location.href = '/admin';
    } else {
      setMsg('Invalid credentials');
    }
  }

  return (
    <div style={{
      maxWidth: '28rem',
      marginLeft: 'auto',
      marginRight: 'auto'
    }} className="card">
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginTop: 0,
        marginBottom: '1rem'
      }}>Staff Login</h1>
      <form onSubmit={onSubmit} style={{
        display: 'grid',
        gap: '0.75rem'
      }}>
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input 
              className="input" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e=>setPassword(e.target.value)}
              style={{
                paddingRight: '2.5rem'
              }}
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
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(37, 99, 235)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(100, 116, 139)'}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L3.596 3.039m7.753 7.753l6.364 6.364" />
                </svg>
              ) : (
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <button className="btn" type="submit" style={{ marginTop: '0.5rem' }}>Login</button>
        {msg && <p style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: msg.includes('Logged') ? 'rgb(240, 253, 244)' : 'rgb(254, 242, 242)',
          color: msg.includes('Logged') ? 'rgb(22, 101, 52)' : 'rgb(127, 29, 29)',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          border: `1px solid ${msg.includes('Logged') ? 'rgb(187, 247, 208)' : 'rgb(254, 205, 211)'}`
        }}>{msg}</p>}
      </form>
    </div>
  );
}

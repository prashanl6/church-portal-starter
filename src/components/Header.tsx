'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in as admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || data.email || null);
          if (data.role === 'admin') {
            setIsAdmin(true);
            setUserRole('admin');
            document.body.classList.add('admin-mode');
          } else if (data.role === 'staff') {
            setUserRole('staff');
          }
        } else {
          setUserName(null);
          document.body.classList.remove('admin-mode');
        }
      } catch (error) {
        setUserName(null);
        document.body.classList.remove('admin-mode');
      }
    };
    checkAuth();
    
    // Check periodically in case of session changes
    const interval = setInterval(checkAuth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Ask for confirmation
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) {
      return; // User cancelled
    }
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      document.body.classList.remove('admin-mode');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <header className={`app-header ${isAdmin ? 'admin-mode' : ''}`}>
      <div className="app-header-inner">
        <div>
          <div className={`app-title ${isAdmin ? 'admin-title' : ''}`}>Church Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <nav className="app-nav">
            <Link className={`app-nav-link ${isAdmin ? 'admin-nav-regular' : ''}`} href="/">Home</Link>
            <Link className={`app-nav-link ${isAdmin ? 'admin-nav-regular' : ''}`} href="/notices">Notices</Link>
            <Link className={`app-nav-link ${isAdmin ? 'admin-nav-regular' : ''}`} href="/sermons">Sermons</Link>
            <Link className={`app-nav-link ${isAdmin ? 'admin-nav-regular' : ''}`} href="/book-hall">Book Hall</Link>
            {isAdmin && (
              <Link className="app-nav-link admin-nav-admin" href="/admin">Admin</Link>
            )}
            {!userRole && (
              <Link className="app-nav-link" href="/login">Staff Login</Link>
            )}
          </nav>
          {(userName || userRole) && (
            <div className="user-info">
              {userName && (
                <span className="user-name">{userName}</span>
              )}
              {userRole && (
                <button className="user-logout-btn" onClick={handleLogout}>Logout</button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


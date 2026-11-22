'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconArrow, IconClose, IconCross, IconMenu } from './Icons';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/notices', label: 'Notices' },
  { href: '/sermons', label: 'Sermons' },
  { href: '/processes', label: 'Processes' },
  { href: '/book-hall', label: 'Book the Hall' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

export default function Header() {
  const pathname = usePathname() || '/';
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || data.email || null);
          setUserRole(data.role === 'admin' || data.role === 'staff' ? data.role : null);
          // Admins see how many changes wait for approval next to the Admin link.
          if (data.role === 'admin') {
            const c = await fetch('/api/approvals/count').then((r) => (r.ok ? r.json() : null)).catch(() => null);
            setPending(typeof c?.count === 'number' ? c.count : 0);
          } else {
            setPending(0);
          }
        } else {
          setUserName(null);
          setUserRole(null);
        }
      } catch {
        setUserName(null);
        setUserRole(null);
      }
    };
    checkAuth();
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu after navigating, and stop the page scrolling behind it.
  // Lets CSS hide change controls from staff (class "admin-only").
  useEffect(() => {
    if (userRole) document.documentElement.dataset.role = userRole;
    else delete document.documentElement.dataset.role;
  }, [userRole]);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      window.location.href = '/';
    }
  };

  const links = [
    ...LINKS,
    ...(userRole ? [{ href: '/admin', label: userRole === 'admin' ? 'Admin' : 'Staff area' }] : []),
  ];

  return (
    <>
      <header className={`app-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="app-header-inner">
          <Link href="/" className="brand" aria-label="Mount Lavinia Methodist Church, home">
            <span className="brand-mark">
              <IconCross size={22} />
            </span>
            <span className="brand-text">
              <span className="brand-name">Mount Lavinia</span>
              <span className="brand-sub">Methodist Church</span>
            </span>
          </Link>

          <nav className="app-nav" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`app-nav-link ${isActive(pathname, l.href) ? 'is-active' : ''} ${
                  l.href === '/admin' ? 'admin-nav-admin' : ''
                }`}
                aria-current={isActive(pathname, l.href) ? 'page' : undefined}
              >
                {l.label}
                {l.href === '/admin' && pending > 0 && (
                  <span className="nav-count" aria-label={`${pending} waiting for approval`}>{pending}</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            {userRole ? (
              <div className="user-info">
                <span className="role-pill">{userRole === 'admin' ? 'Admin' : 'Staff'}</span>
                {userName && <span className="user-name">{userName}</span>}
                <button className="user-logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <Link href="/login" className="user-logout-btn staff-login-link">
                Staff login
              </Link>
            )}
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              <IconMenu size={22} />
              Menu
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-sheet" id="site-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="menu-sheet-inner">
            <div className="menu-sheet-top">
              <span className="brand-name">Menu</span>
              <button className="menu-btn" onClick={() => setMenuOpen(false)} autoFocus>
                <IconClose size={22} />
                Close
              </button>
            </div>
            <nav aria-label="Main">
              {[...links, ...(userRole ? [] : [{ href: '/login', label: 'Staff login' }])].map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`menu-sheet-link ${isActive(pathname, l.href) ? 'is-active' : ''}`}
                  style={{ animationDelay: `${80 + i * 55}ms` }}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>
                    {l.label}
                    {l.href === '/admin' && pending > 0 && <span className="nav-count">{pending}</span>}
                  </span>
                  <IconArrow size={24} />
                </Link>
              ))}
            </nav>
            {userRole && (
              <div style={{ marginTop: '2rem', display: 'grid', gap: '0.75rem' }}>
                <p style={{ margin: 0, color: 'var(--text-3)' }}>
                  Signed in as {userName} ({userRole === 'admin' ? 'Admin' : 'Staff'})
                </p>
                <button className="btn-secondary" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

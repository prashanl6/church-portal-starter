'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isAdminRef = useRef(false);

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/approvals/count');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.count || 0);
      }
    } catch {
      /* the pill simply keeps its last value */
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const admin = res.ok && (await res.json()).role === 'admin';
        setIsAdmin(admin);
        isAdminRef.current = admin;
        if (admin) await fetchCount();
      } catch {
        setIsAdmin(false);
      }
    };
    check();
    const interval = setInterval(() => isAdminRef.current && fetchCount(), 30000);
    const onFocus = () => isAdminRef.current && fetchCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname]);

  const year = new Date().getFullYear();

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
              Mount Lavinia Methodist Church
            </div>
            <div>© {year} · All are welcome.</div>
          </div>
          <nav className="site-footer-links" aria-label="Footer">
            <Link href="/notices">Notices</Link>
            <Link href="/sermons">Sermons</Link>
            <Link href="/processes">Processes</Link>
            <Link href="/book-hall">Book the Hall</Link>
            <Link href="/login">Staff login</Link>
          </nav>
        </div>
      </footer>

      {isAdmin && pendingCount > 0 && !pathname?.startsWith('/admin/approvals') && (
        <Link
          href="/admin/approvals?filter=SUBMITTED"
          className="approvals-pill"
          aria-label={`${pendingCount} changes waiting for approval`}
        >
          <span className="pill-dot" />
          {pendingCount} waiting for approval
        </Link>
      )}
    </>
  );
}

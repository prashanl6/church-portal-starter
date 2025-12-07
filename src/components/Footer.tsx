'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const isAdminRef = useRef(false);

  const fetchCount = async () => {
    try {
      const countRes = await fetch('/api/approvals/count');
      if (countRes.ok) {
        const countData = await countRes.json();
        setPendingCount(countData.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  useEffect(() => {
    const checkAdminAndFetchCount = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          const admin = data.role === 'admin';
          setIsAdmin(admin);
          isAdminRef.current = admin;
          
          if (admin) {
            await fetchCount();
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(() => {
      if (isAdminRef.current) {
        fetchCount();
      }
    }, 30000); // 30 seconds
    
    // Also refresh when window gains focus (user switches back to tab)
    const handleFocus = () => {
      if (isAdminRef.current) {
        fetchCount();
      }
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <footer 
      className="app-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div 
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        {pendingCount > 0 ? (
          <Link 
            href="/admin/approvals?filter=SUBMITTED"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              color: 'rgb(55, 65, 81)',
              fontWeight: 500,
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(226, 232, 240, 0.5)',
              border: '1px solid rgba(203, 213, 225, 0.5)',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgb(30, 41, 59)';
              e.currentTarget.style.backgroundColor = 'rgba(203, 213, 225, 0.7)';
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgb(55, 65, 81)';
              e.currentTarget.style.backgroundColor = 'rgba(226, 232, 240, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.5)';
            }}
          >
            <span>Pending Approvals:</span>
            <span>{pendingCount}</span>
          </Link>
        ) : (
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              color: 'rgb(55, 65, 81)',
              fontWeight: 500
            }}
          >
            <span>Pending Approvals:</span>
            <span>{pendingCount}</span>
          </div>
        )}
      </div>
    </footer>
  );
}


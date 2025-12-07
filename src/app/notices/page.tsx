'use client';
import { useState, useEffect } from 'react';

interface Notice {
  id: number;
  title: string;
  bodyHtml: string;
  weekOf: string;
  status: string;
  createdAt: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices');
        const data = await res.json();
        setNotices(data.list || []);
      } catch (error) {
        console.error('Failed to fetch notices:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.role === 'admin');
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };
    
    fetchNotices();
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            height: '2.5rem',
            backgroundColor: 'rgb(226, 232, 240)',
            borderRadius: '0.5rem',
            width: '12rem',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: '5rem',
              backgroundColor: 'rgb(241, 245, 249)',
              borderRadius: '0.5rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedNotice) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div className="card" style={{
          marginBottom: '2rem',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => setSelectedNotice(null)}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                padding: 0,
                flexShrink: 0
              }}
              title="Back to notices"
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div style={{ flex: 1 }}>
              <h1 className="page-title" style={{
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                marginTop: 0
              }}>{selectedNotice.title}</h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgb(100, 116, 139)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>📅</span>
                <span>
                  {new Date(selectedNotice.weekOf).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Are you sure you want to request deletion of notice "${selectedNotice.title}"? This will require approval before the notice is deleted.`)) {
                    return;
                  }
                  try {
                    const res = await fetch(`/api/admin/notices/${selectedNotice.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      alert('Delete request submitted for approval');
                      // Refresh notices list
                      const noticesRes = await fetch('/api/notices');
                      const noticesData = await noticesRes.json();
                      setNotices(noticesData.list || []);
                      setSelectedNotice(null);
                    } else {
                      const errorData = await res.json().catch(() => ({ error: 'Failed to submit delete request' }));
                      alert(errorData.error || 'Failed to submit delete request');
                    }
                  } catch (error) {
                    alert('Failed to submit delete request');
                  }
                }}
                className="btn btn-delete"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
          </div>

          <article 
            className="notice-content"
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.75,
              color: 'rgb(55, 65, 81)'
            }}
            dangerouslySetInnerHTML={{ __html: selectedNotice.bodyHtml }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Notices</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Stay updated with the latest announcements and church news
          </p>
        </div>

        {notices.length === 0 ? (
          <div className="card" style={{
            textAlign: 'center',
            paddingTop: '3rem',
            paddingBottom: '3rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📢</div>
            <p style={{
              color: 'rgb(100, 116, 139)',
              fontSize: '1.125rem',
              margin: 0
            }}>No notices available</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {notices.map((notice, index) => {
              const dateStr = new Date(notice.weekOf).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: '2-digit'
              });
              
              return (
                <div
                  key={notice.id}
                  className="card"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                    padding: '1.5rem'
                  }}
                >
                  <button
                    onClick={() => setSelectedNotice(notice)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h2 style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'rgb(15, 23, 42)',
                        margin: 0,
                        marginBottom: '0.25rem'
                      }}>
                        {notice.title}
                      </h2>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgb(100, 116, 139)',
                        margin: 0
                      }}>{dateStr}</p>
                    </div>
                    <svg style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      color: 'rgb(148, 163, 184)',
                      flexShrink: 0,
                      marginTop: '0.25rem'
                    }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Are you sure you want to request deletion of notice "${notice.title}"? This will require approval before the notice is deleted.`)) {
                          return;
                        }
                        try {
                          const res = await fetch(`/api/admin/notices/${notice.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            alert('Delete request submitted for approval');
                            // Refresh notices list
                            const noticesRes = await fetch('/api/notices');
                            const noticesData = await noticesRes.json();
                            setNotices(noticesData.list || []);
                          } else {
                            const errorData = await res.json().catch(() => ({ error: 'Failed to submit delete request' }));
                            alert(errorData.error || 'Failed to submit delete request');
                          }
                        } catch (error) {
                          alert('Failed to submit delete request');
                        }
                      }}
                      className="btn btn-delete"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        flexShrink: 0,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

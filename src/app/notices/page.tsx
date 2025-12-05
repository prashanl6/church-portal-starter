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
    fetchNotices();
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
        <div style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          borderBottom: '1px solid rgb(226, 232, 240)',
          zIndex: 10,
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '1rem',
            paddingBottom: '1rem'
          }}>
            <button
              onClick={() => setSelectedNotice(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(241, 245, 249)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Back to notices"
            >
              <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'rgb(15, 23, 42)',
                margin: 0
              }}>{selectedNotice.title}</h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgb(100, 116, 139)',
                margin: '0.25rem 0 0 0'
              }}>
                {new Date(selectedNotice.weekOf).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '48rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingTop: '2rem',
          paddingBottom: '2rem'
        }}>
          <article 
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
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'rgb(15, 23, 42)',
          marginBottom: '2rem'
        }}>Notices</h1>

        {notices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            paddingTop: '3rem',
            paddingBottom: '3rem'
          }}>
            <p style={{
              color: 'rgb(100, 116, 139)',
              fontSize: '1.125rem'
            }}>No notices available</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {notices.map(notice => {
              const dateStr = new Date(notice.weekOf).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: '2-digit'
              });
              
              return (
                <button
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  style={{
                    width: '100%',
                    backgroundColor: 'white',
                    border: '1px solid rgb(226, 232, 240)',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(191, 219, 254)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(226, 232, 240)';
                    e.currentTarget.style.boxShadow = 'none';
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

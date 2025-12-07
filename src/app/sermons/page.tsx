'use client';
import { useState, useEffect } from 'react';

interface Sermon {
  id: number;
  title: string;
  speaker: string;
  link: string;
  date: string;
  views: number;
  rating: number;
  tagsJson: string | null;
}

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchSermons = async () => {
      try {
        const res = await fetch('/api/sermons');
        const data = await res.json();
        const sermonList = data.list || [];
        
        // Deduplicate sermons by calendar date (YYYY-MM-DD) to avoid showing multiple
        // records for the same date. Keep the first (newest) sermon for each day.
        const seen = new Set<string>();
        const deduped: Sermon[] = [];
        for (const s of sermonList) {
          const dayKey = new Date(s.date).toISOString().slice(0, 10);
          if (!seen.has(dayKey)) {
            seen.add(dayKey);
            deduped.push(s);
          }
        }
        setSermons(deduped);
      } catch (error) {
        console.error('Failed to fetch sermons:', error);
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
    
    fetchSermons();
    checkAdmin();
  }, []);

  const handleDelete = async (sermonId: number, sermonTitle: string) => {
    if (!window.confirm(`Are you sure you want to request deletion of sermon "${sermonTitle}"? This will require approval before the sermon is deleted.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/sermons/${sermonId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Delete request submitted for approval');
        // Refresh sermons list
        const sermonsRes = await fetch('/api/sermons');
        const sermonsData = await sermonsRes.json();
        const sermonList = sermonsData.list || [];
        const seen = new Set<string>();
        const deduped: Sermon[] = [];
        for (const s of sermonList) {
          const dayKey = new Date(s.date).toISOString().slice(0, 10);
          if (!seen.has(dayKey)) {
            seen.add(dayKey);
            deduped.push(s);
          }
        }
        setSermons(deduped);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to submit delete request' }));
        alert(errorData.error || 'Failed to submit delete request');
      }
    } catch (error) {
      alert('Failed to submit delete request');
    }
  };

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

  const getTheme = (sermon: Sermon) => {
    if (sermon.tagsJson) {
      try {
        const tags = JSON.parse(sermon.tagsJson);
        return tags.theme || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Sermons</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>
          Watch and listen to inspiring messages from our services
        </p>
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {sermons.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎤</div>
            <p style={{ color: 'rgb(100, 116, 139)', fontSize: '1.125rem', margin: 0 }}>
              No sermons available yet
            </p>
          </div>
        ) : (
          sermons.map((s, index) => {
            const theme = getTheme(s);
            return (
              <div 
                key={s.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  gap: '1.5rem',
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: 600, 
                    color: 'rgb(15, 23, 42)',
                    marginBottom: '0.5rem'
                  }}>
                    {s.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'rgb(71, 85, 105)',
                    marginBottom: '0.25rem'
                  }}>
                    {s.speaker}{theme ? ` — ${theme}` : ''}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'rgb(100, 116, 139)',
                    marginBottom: '0.5rem'
                  }}>
                    {new Date(s.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    fontSize: '0.875rem',
                    color: 'rgb(100, 116, 139)'
                  }}>
                    <span>👁️ {s.views} views</span>
                    <span>⭐ {s.rating}/5</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <a 
                    className="btn btn-primary" 
                    href={s.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', flexShrink: 0 }}
                  >
                    ▶ Watch
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(s.id, s.title)}
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

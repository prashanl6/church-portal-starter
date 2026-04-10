'use client';
import { useState, useEffect } from 'react';

const RATER_STORAGE_KEY = 'sermon-rater-client-id';

function getOrCreateRaterClientId(): string {
  let id = localStorage.getItem(RATER_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(RATER_STORAGE_KEY, id);
  }
  return id;
}

interface Sermon {
  id: number;
  title: string;
  speaker: string;
  link: string;
  date: string;
  tagsJson: string | null;
  averageRating: number | null;
  ratingCount: number;
  yourStars: number | null;
}

function StarRatingRow({
  yourStars,
  disabled,
  onRate
}: {
  yourStars: number | null;
  disabled: boolean;
  onRate: (stars: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Rate this sermon from 1 to 5 stars"
      style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', flexWrap: 'wrap' }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = yourStars != null && n <= yourStars;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={filled}
            onClick={() => onRate(n)}
            style={{
              padding: '0.15rem 0.25rem',
              fontSize: '1.25rem',
              lineHeight: 1,
              border: 'none',
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: filled ? 'rgb(234, 179, 8)' : 'rgb(203, 213, 225)',
              opacity: disabled ? 0.6 : 1
            }}
          >
            {filled ? '\u2605' : '\u2606'}
          </button>
        );
      })}
    </div>
  );
}

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [raterClientId, setRaterClientId] = useState<string | null>(null);
  const [ratingBusyId, setRatingBusyId] = useState<number | null>(null);

  useEffect(() => {
    const cid = getOrCreateRaterClientId();
    setRaterClientId(cid);

    const fetchSermons = async () => {
      try {
        const res = await fetch(`/api/sermons?clientId=${encodeURIComponent(cid)}`);
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

  const loadSermonsWithClient = async (cid: string) => {
    const res = await fetch(`/api/sermons?clientId=${encodeURIComponent(cid)}`);
    const data = await res.json();
    const sermonList = data.list || [];
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
  };

  const submitRating = async (sermonId: number, stars: number) => {
    if (!raterClientId) return;
    setRatingBusyId(sermonId);
    try {
      const res = await fetch('/api/sermons/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonId, stars, clientId: raterClientId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === 'string' ? data.error : 'Could not save rating');
        return;
      }
      setSermons((prev) =>
        prev.map((s) =>
          s.id === sermonId
            ? {
                ...s,
                yourStars: data.yourStars ?? stars,
                averageRating: data.averageRating ?? s.averageRating,
                ratingCount: data.ratingCount ?? s.ratingCount
              }
            : s
        )
      );
    } catch {
      alert('Could not save rating');
    } finally {
      setRatingBusyId(null);
    }
  };

  const handleDelete = async (sermonId: number, sermonTitle: string) => {
    if (!window.confirm(`Are you sure you want to request deletion of sermon "${sermonTitle}"? This will require approval before the sermon is deleted.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/sermons/${sermonId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Delete request submitted for approval');
        if (raterClientId) await loadSermonsWithClient(raterClientId);
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
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'rgb(100, 116, 139)'
                    }}
                  >
                    <div>
                      {s.ratingCount === 0 ? (
                        <span>No ratings yet</span>
                      ) : (
                        <span>
                          <strong style={{ color: 'rgb(15, 23, 42)' }}>{s.averageRating}</strong> / 5 average ·{' '}
                          {s.ratingCount} rating{s.ratingCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                      <StarRatingRow
                        yourStars={s.yourStars}
                        disabled={ratingBusyId === s.id}
                        onRate={(n) => submitRating(s.id, n)}
                      />
                      {s.yourStars != null && (
                        <span style={{ fontSize: '0.8125rem' }}>Your rating: {s.yourStars}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'rgb(148, 163, 184)' }}>
                      One rating per device; you can change your stars anytime.
                    </span>
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

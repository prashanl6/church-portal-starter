'use client';
import { useState, useEffect } from 'react';
import Reveal from '@/components/Reveal';
import { IconSermon } from '@/components/Icons';
import { EmptyState, PageHeader, SkeletonList, longDate } from '@/components/ui';

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
      style={{ display: 'flex', gap: '0.1rem', alignItems: 'center', flexWrap: 'wrap' }}
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
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 'none',
              borderRadius: 12,
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: filled ? '#d4a017' : '#cfccc4',
              opacity: disabled ? 0.6 : 1,
              transition: 'transform var(--dur-1) var(--ease), color var(--dur-1)'
            }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true"
              fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
              <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
            </svg>
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
      <div className="page">
        <PageHeader title="Sermons" subtitle="Watch or listen again to messages from our services." />
        <SkeletonList rows={4} height={150} />
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
    <div className="page">
      <PageHeader title="Sermons" subtitle="Watch or listen again to messages from our services." />
      {sermons.length === 0 ? (
        <EmptyState
          icon={<IconSermon />}
          title="No sermons yet"
          text="Recordings appear here after each service. Please check again later."
        />
      ) : (
        <div className="stack">
          {sermons.map((s, index) => {
            const theme = getTheme(s);
            return (
              <Reveal key={s.id} delay={Math.min(index, 4) * 70}>
                <div className="card" style={{ display: 'grid', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', alignItems: 'flex-start' }}>
                    <span
                      className="tile-icon"
                      style={{ background: '#efeaf6', color: '#6a5a9e', marginBottom: 0, flexShrink: 0 }}
                    >
                      <IconSermon />
                    </span>
                    <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
                      <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>{longDate(s.date)}</span>
                      <h2 className="tile-title" style={{ fontSize: '1.45rem' }}>{s.title}</h2>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--text-2)', fontSize: '1.08rem' }}>
                        {s.speaker}
                        {theme ? ` · ${theme}` : ''}
                      </p>
                    </div>
                    <a
                      className="btn"
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flexShrink: 0 }}
                    >
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                      </svg>
                      Watch
                    </a>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--line)',
                      paddingTop: '1rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem 1.5rem'
                    }}
                  >
                    <div style={{ display: 'grid', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        {s.yourStars != null ? `Your rating: ${s.yourStars} of 5` : 'How helpful was this sermon?'}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.98rem' }}>
                        {s.ratingCount === 0 ? (
                          'No ratings yet'
                        ) : (
                          <>
                            Average {s.averageRating} / 5 from {s.ratingCount} rating{s.ratingCount !== 1 ? 's' : ''}
                          </>
                        )}
                      </span>
                    </div>
                    <StarRatingRow
                      yourStars={s.yourStars}
                      disabled={ratingBusyId === s.id}
                      onRate={(n) => submitRating(s.id, n)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="hint" style={{ margin: 0 }}>
                      One rating per device. You can change your stars at any time.
                    </span>
                    {isAdmin && (
                      <button type="button" className="btn-quiet danger" onClick={() => handleDelete(s.id, s.title)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

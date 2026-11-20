'use client';
import { useEffect, useState } from 'react';
import Reveal from '@/components/Reveal';
import { IconSermon } from '@/components/Icons';
import { EmptyState, PageHeader, SkeletonList, longDate } from '@/components/ui';

// Read-only. Sermons are added and removed in one place only: Admin → Sermons.

const VIEWER_KEY = 'sermon-rater-client-id';

function viewerId(): string {
  try {
    let id = localStorage.getItem(VIEWER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VIEWER_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

interface Sermon {
  id: number;
  title: string;
  speaker: string;
  link: string;
  date: string;
  tagsJson: string | null;
  views: number;
}

function theme(s: Sermon): string | null {
  try {
    return s.tagsJson ? JSON.parse(s.tagsJson).theme || null : null;
  } catch {
    return null;
  }
}

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sermons')
      .then((r) => r.json())
      .then((d) => setSermons(d.list || []))
      .catch(() => setSermons([]))
      .finally(() => setLoading(false));
  }, []);

  // Opening a sermon counts one view for this device; the rating is the number of views.
  const recordView = (s: Sermon) => {
    fetch('/api/sermons/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sermonId: s.id, clientId: viewerId() }),
      keepalive: true,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSermons((list) => list.map((x) => (x.id === s.id ? { ...x, views: d.views } : x))))
      .catch(() => {});
  };

  return (
    <div className="page">
      <PageHeader title="Sermons" subtitle="Watch or listen again to messages from our services." />

      {loading ? (
        <SkeletonList rows={3} height={150} />
      ) : sermons.length === 0 ? (
        <EmptyState icon={<IconSermon />} title="No sermons yet" text="Recordings appear here after each service. Please check again later." />
      ) : (
        <div className="stack">
          {sermons.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 4) * 70}>
              <article className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                <span className="tile-icon" style={{ margin: 0, background: '#efeaf6', color: '#6a5a9e' }}>
                  <IconSermon />
                </span>
                <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
                  <span className="eyebrow" style={{ marginBottom: '0.3rem' }}>{longDate(s.date)}</span>
                  <h2 className="tile-title" style={{ fontSize: '1.4rem' }}>{s.title}</h2>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-2)' }}>
                    {s.speaker}
                    {theme(s) ? ` · ${theme(s)}` : ''}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--text-3)' }}>
                    Rating {s.views} · {s.views === 1 ? '1 view' : `${s.views} views`}
                  </p>
                </div>
                <a className="btn" href={s.link} target="_blank" rel="noopener noreferrer" onClick={() => recordView(s)}>
                  ▶ Watch
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

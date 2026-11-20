'use client';
import { useState, useEffect } from 'react';
import Reveal from '@/components/Reveal';
import { IconNotice } from '@/components/Icons';
import { DateChip, EmptyState, PageHeader, RowChevron, SkeletonList, longDate } from '@/components/ui';

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
  // Read-only. Notices are written and removed in one place only: Admin → Notices.

  useEffect(() => {
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setNotices(d.list || []))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  const openNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Notices" subtitle="This week’s announcements and church news." />
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (selectedNotice) {
    return (
      <article className="page panel-enter" style={{ maxWidth: '46rem', margin: '0 auto', width: '100%' }}>
        <div>
          <button
            type="button"
            onClick={() => setSelectedNotice(null)}
            className="back-link"
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
            All notices
          </button>
          <span className="eyebrow" style={{ display: 'block' }}>Week of {longDate(selectedNotice.weekOf)}</span>
          <h1 className="page-title">{selectedNotice.title}</h1>
        </div>

        <div className="card" style={{ padding: 'clamp(1.5rem, 4vw, 2.75rem)' }}>
          <div
            className="notice-content"
            style={{ fontSize: '1.15rem', maxWidth: '42rem' }}
            dangerouslySetInnerHTML={{ __html: selectedNotice.bodyHtml }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem' }}>
          <button type="button" className="btn-secondary" onClick={() => setSelectedNotice(null)}>
            Back to all notices
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Notices" subtitle="This week’s announcements and church news. Tap a notice to read it." />

      {notices.length === 0 ? (
        <EmptyState
          icon={<IconNotice />}
          title="No notices yet"
          text="New notices appear here as soon as they are published. Please check again later."
        />
      ) : (
        <Reveal>
          <div className="list-group">
            {notices.map((notice, i) => (
              <div key={notice.id} style={{ display: 'flex', alignItems: 'center', borderTop: i ? '1px solid var(--line)' : 0 }}>
                <button
                  type="button"
                  className="list-row"
                  style={{ borderTop: 0 }}
                  onClick={() => openNotice(notice)}
                >
                  <DateChip date={notice.weekOf} />
                  <span className="list-row-main">
                    <span className="list-row-title">{notice.title}</span>
                    <span className="list-row-meta">Week of {longDate(notice.weekOf)}</span>
                  </span>
                  <RowChevron />
                </button>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

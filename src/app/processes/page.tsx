'use client';
import { useEffect, useState } from 'react';
import { PageHeader, EmptyState, SkeletonList, RowChevron, longDate } from '@/components/ui';
import { IconBook, IconNotice } from '@/components/Icons';

// Read-only. Processes are added and changed in one place only: Admin → Processes.

interface Attachment {
  id: number;
  fileName: string;
  storedPath: string;
  byteSize: number | null;
}

interface Process {
  id: number;
  title: string;
  contentHtml: string;
  version: number;
  audience: 'public' | 'steward';
  ownerName: string | null;
  updatedAt: string;
  attachments: Attachment[];
}

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selected, setSelected] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [auth, res] = await Promise.all([fetch('/api/auth/check'), fetch('/api/processes')]);
        setLoggedIn(auth.ok);
        const data = await res.json();
        setProcesses(
          (data.list || []).map((p: any) => ({
            ...p,
            audience: p.audience === 'steward' ? 'steward' : 'public',
            attachments: Array.isArray(p.attachments) ? p.attachments : [],
          }))
        );
      } catch {
        setProcesses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Let the browser Back button close the reading view.
  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = (p: Process) => {
    window.history.pushState({ process: p.id }, '');
    setSelected(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const close = () => {
    if (window.history.state?.process) window.history.back();
    else setSelected(null);
  };

  if (selected) {
    return (
      <div className="page panel-enter" style={{ maxWidth: '46rem', margin: '0 auto', width: '100%' }}>
        <div>
          <button type="button" className="back-link" onClick={close} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
            ‹ All processes
          </button>
          <h1 className="page-title">{selected.title}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {selected.ownerName ? <>Owner: {selected.ownerName} · </> : null}
            Version {selected.version} · Updated {longDate(selected.updatedAt)}
            {selected.audience === 'steward' && <> · <span className="badge badge-blue">Stewards only</span></>}
          </p>
        </div>

        <article className="card notice-content" dangerouslySetInnerHTML={{ __html: selected.contentHtml }} />

        {selected.attachments.length > 0 && (
          <section>
            <h2 className="section-label">Files to download</h2>
            <div className="list-group">
              {selected.attachments.map((a) => (
                <a key={a.id} href={a.storedPath} className="list-row" download>
                  <span className="tile-icon" style={{ width: 44, height: 44, margin: 0, background: 'var(--success-soft)', color: '#2f6b47' }}>
                    <IconNotice size={22} />
                  </span>
                  <span className="list-row-main">
                    <span className="list-row-title">{a.fileName}</span>
                    <span className="list-row-meta">Download {formatBytes(a.byteSize)}</span>
                  </span>
                  <RowChevron />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Church processes"
        subtitle={
          loggedIn
            ? 'Step-by-step guides for church activities, including those for stewards.'
            : 'Step-by-step guides for church activities. Tap a guide to read it.'
        }
      />

      {loading ? (
        <SkeletonList rows={4} />
      ) : processes.length === 0 ? (
        <EmptyState icon={<IconBook />} title="No guides yet" text="Guides will appear here once they are published." />
      ) : (
        <div className="list-group">
          {processes.map((p) => (
            <button key={p.id} type="button" className="list-row" onClick={() => open(p)}>
              <span className="tile-icon" style={{ width: 48, height: 48, margin: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <IconBook size={24} />
              </span>
              <span className="list-row-main">
                <span className="list-row-title">{p.title}</span>
                <span className="list-row-meta">
                  {p.audience === 'steward' ? 'Stewards only · ' : ''}
                  {p.attachments.length > 0 ? `${p.attachments.length} file${p.attachments.length === 1 ? '' : 's'} · ` : ''}
                  Updated {longDate(p.updatedAt)}
                </span>
              </span>
              <RowChevron />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import useSWR from 'swr';
import { PageHeader, ADMIN_BACK, EmptyState, SkeletonList, StatusBadge } from '@/components/ui';
import { IconList } from '@/components/Icons';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function pretty(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function humanAction(action: string) {
  return String(action || '')
    .replace(/[._]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function person(p: any) {
  return p ? p.name || p.email : '';
}

const preStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  padding: '0.85rem 1rem',
  marginTop: '0.5rem',
  borderRadius: 'var(--radius-sm)',
  overflow: 'auto',
  maxHeight: '320px',
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
};

export default function AuditLogsPage() {
  const { data } = useSWR('/api/admin/audit', fetcher);
  const list = data?.list || [];

  return (
    <div className="page">
      <PageHeader
        back={ADMIN_BACK}
        title="Audit log"
        subtitle="A permanent record of every change: who asked for it, who approved it, and when."
      />

      {!data ? (
        <SkeletonList rows={5} />
      ) : list.length === 0 ? (
        <EmptyState icon={<IconList />} title="No audit logs yet" text="Changes will be recorded here as they happen." />
      ) : (
        <div className="list-group">
          {list.map((log: any) => (
            <div key={log.id} className="list-row" style={{ cursor: 'default', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="list-row-main" style={{ flexBasis: '20rem' }}>
                <span className="list-row-title">{humanAction(log.action)}</span>
                <span className="list-row-meta">
                  {new Date(log.createdAt).toLocaleString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="list-row-meta" style={{ color: 'var(--text-2)' }}>
                  {log.resourceType} #{log.resourceId}
                  {log.actor ? ` · By ${person(log.actor)} (${log.actor.email})` : ` · By user #${log.actorId}`}
                  {log.requestor && ` · Requested by ${person(log.requestor)}`}
                  {log.approver && ` · Approved by ${person(log.approver)}`}
                  {log.theme && ` · Theme: ${log.theme}`}
                </span>
                {log.userAgent && (
                  <span className="list-row-meta" style={{ fontSize: '0.88rem', wordBreak: 'break-word' }}>
                    {log.userAgent}
                  </span>
                )}
                {(log.beforeJson || log.afterJson) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 1.5rem', marginTop: '0.35rem' }}>
                    {log.beforeJson && (
                      <details style={{ flex: '1 1 16rem', minWidth: 0 }}>
                        <summary className="btn-quiet" style={{ paddingLeft: 0 }}>Show before</summary>
                        <pre style={preStyle}>{pretty(log.beforeJson)}</pre>
                      </details>
                    )}
                    {log.afterJson && (
                      <details style={{ flex: '1 1 16rem', minWidth: 0 }}>
                        <summary className="btn-quiet" style={{ paddingLeft: 0 }}>Show after</summary>
                        <pre style={preStyle}>{pretty(log.afterJson)}</pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
              {log.status && <StatusBadge status={log.status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

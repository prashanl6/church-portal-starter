// Shared building blocks so every page looks and behaves the same.
// Styles live in globals.css under "Shared page parts".
import Link from 'next/link';

function Chevron({ dir = 'right', size = 20 }: { dir?: 'left' | 'right'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'right' ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
    </svg>
  );
}

/** Page title block with an optional back link, eyebrow and actions on the right. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div>
      {back && (
        <Link href={back.href} className="back-link">
          <Chevron dir="left" /> {back.label}
        </Link>
      )}
      <div className="page-head">
        <div style={{ minWidth: 0, flex: '1 1 20rem' }}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>{actions}</div>}
      </div>
    </div>
  );
}

/** Standard "Back to Admin" link target for admin pages. */
export const ADMIN_BACK = { href: '/admin', label: 'Admin' };

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card empty-state">
      {icon && <span className="tile-icon">{icon}</span>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: '1.5rem' }}>{action}</div>}
    </div>
  );
}

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: React.ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

/** Rounded loading placeholders shown while data loads. */
export function SkeletonList({ rows = 4, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div className="stack-sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

/** Friendly coloured badge for a status code such as SUBMITTED or BOOKED_PAID. */
export function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();
  const map: Record<string, [string, string]> = {
    SUBMITTED: ['Waiting for approval', 'amber'],
    PENDING: ['Waiting for approval', 'amber'],
    PENDING_APPROVAL: ['Waiting for approval', 'amber'],
    REQUESTED: ['Requested', 'amber'],
    APPROVED: ['Approved', 'green'],
    ACTIVE: ['Active', 'green'],
    PUBLISHED: ['Published', 'green'],
    APPROVED_PENDING_PAYMENT: ['Approved – awaiting payment', 'blue'],
    BOOKED_PAID: ['Booked and paid', 'green'],
    ISSUED: ['On loan', 'blue'],
    RETURNED: ['Returned', 'green'],
    REJECTED: ['Rejected', 'red'],
    CANCELLED: ['Cancelled', 'red'],
    DELETED: ['Deleted', 'red'],
    INACTIVE: ['Inactive', ''],
    DRAFT: ['Draft', ''],
  };
  const [label, tone] = map[s] || [s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), ''];
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{label}</span>;
}

export function RowChevron() {
  return (
    <span className="list-row-chevron">
      <Chevron />
    </span>
  );
}

/** Big calendar-style date tile used in lists. */
export function DateChip({ date }: { date: string | Date }) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return (
    <span className="date-chip" aria-hidden="true">
      <small>{d.toLocaleDateString('en-GB', { month: 'short' })}</small>
      <b>{d.getDate()}</b>
    </span>
  );
}

/** Long, unambiguous date for older readers, e.g. "Sunday, 15 November 2026". */
export function longDate(date: string | Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

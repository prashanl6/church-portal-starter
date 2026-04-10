import Link from 'next/link';

export default function AdminHome() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-3">
        <Link className="btn" href="/admin/approvals?filter=SUBMITTED">Approvals Queue</Link>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link className="btn-secondary" href="/admin/assets">Assets</Link>
          <Link className="btn-secondary" href="/admin/notices">Notices</Link>
          <Link className="btn-secondary" href="/admin/sermons">Sermons</Link>
          <Link className="btn-secondary" href="/admin/people">Birthdays & Anniversaries</Link>
          <Link className="btn-secondary" href="/admin/bookings">Bookings</Link>
          <Link className="btn-secondary" href="/admin/church-bank-account">Church Bank Account Details</Link>
          <Link className="btn-secondary" href="/admin/medical">Medical Equipment</Link>
          <Link className="btn-secondary" href="/admin/processes">Processes</Link>
          <Link className="btn-secondary" href="/admin/audit">Audit Logs</Link>
        </div>
      </div>
    </div>
  )
}

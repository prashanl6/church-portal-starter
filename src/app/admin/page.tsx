'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Reveal from '@/components/Reveal';
import {
  IconArrow,
  IconBank,
  IconBook,
  IconBox,
  IconCalendar,
  IconCheck,
  IconClock,
  IconHeart,
  IconList,
  IconNotice,
  IconPeople,
  IconSermon,
} from '@/components/Icons';

const SECTIONS = [
  { href: '/admin/notices', title: 'Notices', text: 'Write and publish weekly notices.', icon: <IconNotice />, tint: ['#e8eef7', '#2b5c9e'] },
  { href: '/admin/sermons', title: 'Sermons', text: 'Add sermon recordings and links.', icon: <IconSermon />, tint: ['#efeaf6', '#6a5a9e'] },
  { href: '/admin/bookings', title: 'Hall bookings', text: 'Requests, payments and hall rates.', icon: <IconCalendar />, tint: ['#e9f2ec', '#4f7a62'] },
  { href: '/admin/people', title: 'Birthdays & anniversaries', text: 'Members and their special dates.', icon: <IconPeople />, tint: ['#f6ede4', '#9a6a3c'] },
  { href: '/admin/assets', title: 'Assets', text: 'Church property and equipment register.', icon: <IconBox />, tint: ['#eef0f2', '#4d5866'] },
  { href: '/admin/medical', title: 'Medical equipment', text: 'Lend and track wheelchairs and aids.', icon: <IconHeart />, tint: ['#f7e9ea', '#a2434c'] },
  { href: '/admin/processes', title: 'Processes', text: 'Guides and forms for church activities.', icon: <IconBook />, tint: ['#e7f1f3', '#3e7480'] },
  { href: '/admin/church-bank-account', title: 'Bank account details', text: 'Details shown to people paying for bookings.', icon: <IconBank />, tint: ['#eef0f7', '#4a5a8c'] },
  { href: '/admin/accounts', title: 'Accounts', text: 'Add or switch off staff and administrator logins.', icon: <IconPeople />, tint: ['#eef0f7', '#4a5a8c'] },
  { href: '/admin/audit', title: 'Audit log', text: 'A record of every change and approval.', icon: <IconList />, tint: ['#f1f0ec', '#66645c'] },
];

export default function AdminHome() {
  const [pending, setPending] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/check')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRole(d?.role ?? null))
      .catch(() => {});
    fetch('/api/approvals/count')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPending(typeof d?.count === 'number' ? d.count : null))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'grid', gap: '2.5rem' }}>
      <div>
        <span className="eyebrow">{role === 'staff' ? 'Staff area' : 'Administration'}</span>
        <h1 className="page-title">Good to see you.</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>
          {role === 'staff'
            ? 'You can view everything here. Changes are made by administrators.'
            : 'Every change you make is checked and approved by a second administrator before it goes live.'}
        </p>
      </div>

      <Reveal>
        <Link
          href="/admin/approvals?filter=SUBMITTED"
          className="feature-card"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
            background: 'linear-gradient(135deg, #ffffff, #f2f5fa)',
          }}
        >
          <span className="tile-icon" style={{ background: 'var(--accent)', color: '#fff', marginBottom: 0 }}>
            <IconCheck />
          </span>
          <span style={{ flex: '1 1 16rem' }}>
            <span className="tile-title" style={{ display: 'block' }}>
              Approvals
            </span>
            <span className="tile-text" style={{ display: 'block' }}>
              {pending === null
                ? 'Changes waiting for a second administrator.'
                : pending === 0
                  ? 'All caught up. Nothing is waiting.'
                  : `${pending} ${pending === 1 ? 'change is' : 'changes are'} waiting for approval.`}
            </span>
          </span>
          <span className="tile-more" style={{ marginTop: 0 }}>
            {pending ? 'Review now' : 'Open'} <IconArrow size={20} />
          </span>
        </Link>
      </Reveal>

      <div className="admin-tile-grid">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.href} delay={(i % 3) * 80}>
            <Link href={s.href} className="feature-card admin-tile" style={{ height: '100%', boxSizing: 'border-box' }}>
              <span className="tile-icon" style={{ background: s.tint[0], color: s.tint[1] }}>
                {s.icon}
              </span>
              <h2 className="tile-title">{s.title}</h2>
              <p className="tile-text">{s.text}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <p style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
        <IconClock size={20} /> For your safety you are logged out automatically after 8 hours.
      </p>
    </div>
  );
}

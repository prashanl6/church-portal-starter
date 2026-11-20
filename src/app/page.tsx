'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Reveal from '@/components/Reveal';
import { IconArrow, IconBook, IconCalendar, IconNotice, IconSermon } from '@/components/Icons';

type Notice = { id: number; title: string; weekOf: string };

const TILES = [
  {
    href: '/notices',
    title: 'Weekly notices',
    text: 'Read this week’s announcements, events and church news.',
    icon: <IconNotice />,
    tint: ['#e8eef7', '#2b5c9e'],
  },
  {
    href: '/sermons',
    title: 'Sermons',
    text: 'Watch or listen again to messages from our services.',
    icon: <IconSermon />,
    tint: ['#efeaf6', '#6a5a9e'],
  },
  {
    href: '/book-hall',
    title: 'Book the hall',
    text: 'Check free dates and request the Main Hall or Chapel.',
    icon: <IconCalendar />,
    tint: ['#e9f2ec', '#4f7a62'],
  },
  {
    href: '/processes',
    title: 'Church processes',
    text: 'Step-by-step guides and forms for church activities.',
    icon: <IconBook />,
    tint: ['#f6ede4', '#9a6a3c'],
  },
];

function formatWeek(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Home() {
  const [latest, setLatest] = useState<Notice | null>(null);

  useEffect(() => {
    fetch('/api/notices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLatest(d?.list?.[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  return (
    <div className="home">
      <section className="hero-card" style={{ textAlign: 'center' }}>
        <div className="aura" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div style={{ animation: 'fadeInUp 1.2s var(--ease) 0.1s both' }}>
          <span className="eyebrow">Mount Lavinia Methodist Church</span>
        </div>
        <h1 className="hero-title" style={{ animation: 'fadeInUp 1.2s var(--ease) 0.2s both' }}>
          Welcome. <span className="gradient-text">You belong here.</span>
        </h1>
        <p className="hero-lead" style={{ animation: 'fadeInUp 1.2s var(--ease) 0.35s both' }}>
          Notices, sermons and hall bookings, all in one quiet place.
        </p>
        <div className="hero-actions" style={{ animation: 'fadeInUp 1.2s var(--ease) 0.5s both' }}>
          <Link className="btn" href="/notices">
            Read this week’s notices
          </Link>
          <Link className="btn-secondary" href="/book-hall">
            Book the hall
          </Link>
        </div>
      </section>

      {latest && (
        <Reveal>
          <Link href="/notices" className="card latest-card">
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              Latest notice
            </span>
            <span className="section-title" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>
              {latest.title}
            </span>
            <span style={{ color: 'var(--text-3)' }}>Week of {formatWeek(latest.weekOf)}</span>
            <span className="tile-more" style={{ marginTop: '0.5rem' }}>
              Read the notices <IconArrow size={20} />
            </span>
          </Link>
        </Reveal>
      )}

      <section>
        <Reveal className="section-head">
          <h2 className="section-title">What would you like to do?</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Choose a card below. Everything is one tap away.
          </p>
        </Reveal>
        <div className="tile-grid">
          {TILES.map((t, i) => (
            <Reveal key={t.href} delay={i * 90}>
              <Link href={t.href} className="feature-card" style={{ height: '100%', boxSizing: 'border-box' }}>
                <span className="tile-icon" style={{ background: t.tint[0], color: t.tint[1] }}>
                  {t.icon}
                </span>
                <h3 className="tile-title">{t.title}</h3>
                <p className="tile-text">{t.text}</p>
                <span className="tile-more">
                  Open <IconArrow size={20} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="verse">
        <p className="verse-text">“Be still, and know that I am God.”</p>
        <p className="verse-ref">Psalm 46:10</p>
      </Reveal>
    </div>
  );
}

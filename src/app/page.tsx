'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      display: 'grid',
      gap: '2rem'
    }}>
      <section className="card" style={{
        textAlign: 'center'
      }}>
        <h1 className="page-title" style={{
          marginBottom: '1rem',
          marginTop: 0
        }}>Welcome to Church Portal</h1>
        <p className="page-subtitle" style={{
          marginBottom: '2rem'
        }}>
          Access announcements, events, and church resources in one place
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <Link className="btn" href="/notices" style={{ textDecoration: 'none' }}>
            📢 View Notices
          </Link>
          <Link className="btn" href="/sermons" style={{ textDecoration: 'none' }}>
            🎤 Listen to Sermons
          </Link>
          <Link className="btn" href="/book-hall" style={{ textDecoration: 'none' }}>
            📅 Book the Hall
          </Link>
        </div>
      </section>
    </div>
  );
}
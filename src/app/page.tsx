'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      display: 'grid',
      gap: '3rem',
      animation: 'fadeIn 0.6s ease-out'
    }}>
      {/* Hero Section */}
      <section className="hero-card" style={{
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="page-title" style={{
            marginBottom: '1rem',
            marginTop: 0,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            lineHeight: 1.2
          }}>Welcome to Mount Lavinia Methodist Church</h1>
          <p className="page-subtitle" style={{
            marginBottom: '2.5rem',
            fontSize: '1.125rem',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Access announcements, events, and church resources in one place
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <Link className="btn btn-primary" href="/notices" style={{ textDecoration: 'none' }}>
              <span style={{ marginRight: '0.5rem' }}>📢</span>
              View Notices
            </Link>
            <Link className="btn btn-primary" href="/sermons" style={{ textDecoration: 'none' }}>
              <span style={{ marginRight: '0.5rem' }}>🎤</span>
              Listen to Sermons
            </Link>
            <Link className="btn btn-primary" href="/book-hall" style={{ textDecoration: 'none' }}>
              <span style={{ marginRight: '0.5rem' }}>📅</span>
              Book the Hall
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Features */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <div className="feature-card" style={{
          animation: 'fadeInUp 0.6s ease-out 0.1s both'
        }}>
          <div style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            display: 'inline-block'
          }}>📢</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'rgb(15, 23, 42)'
          }}>Weekly Notices</h3>
          <p style={{
            color: 'rgb(71, 85, 105)',
            lineHeight: 1.6,
            margin: 0
          }}>Stay updated with the latest announcements and church news</p>
        </div>
        <div className="feature-card" style={{
          animation: 'fadeInUp 0.6s ease-out 0.2s both'
        }}>
          <div style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            display: 'inline-block'
          }}>🎤</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'rgb(15, 23, 42)'
          }}>Sermons</h3>
          <p style={{
            color: 'rgb(71, 85, 105)',
            lineHeight: 1.6,
            margin: 0
          }}>Watch and listen to inspiring sermons from our services</p>
        </div>
        <div className="feature-card" style={{
          animation: 'fadeInUp 0.6s ease-out 0.3s both'
        }}>
          <div style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            display: 'inline-block'
          }}>📅</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'rgb(15, 23, 42)'
          }}>Book Facilities</h3>
          <p style={{
            color: 'rgb(71, 85, 105)',
            lineHeight: 1.6,
            margin: 0
          }}>Reserve the hall or chapel for your events and gatherings</p>
        </div>
      </section>
    </div>
  );
}
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function SermonsPage() {
  const sermons = await prisma.sermon.findMany({ where: { status: 'published' }, orderBy: { date: 'desc' } });

  // Deduplicate sermons by calendar date (YYYY-MM-DD) to avoid showing multiple
  // records for the same date. Keep the first (newest) sermon for each day.
  const seen = new Set<string>();
  const deduped: typeof sermons = [];
  for (const s of sermons) {
    const dayKey = new Date(s.date).toISOString().slice(0, 10);
    if (!seen.has(dayKey)) {
      seen.add(dayKey);
      deduped.push(s);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Sermons</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>
          Watch and listen to inspiring messages from our services
        </p>
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {deduped.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎤</div>
            <p style={{ color: 'rgb(100, 116, 139)', fontSize: '1.125rem', margin: 0 }}>
              No sermons available yet
            </p>
          </div>
        ) : (
          deduped.map((s, index) => (
            <div 
              key={s.id} 
              className="card" 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: '1.5rem',
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: 600, 
                  color: 'rgb(15, 23, 42)',
                  marginBottom: '0.5rem'
                }}>
                  {s.title}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgb(71, 85, 105)',
                  marginBottom: '0.25rem'
                }}>
                  {s.speaker} {(s as any).theme ? `— ${(s as any).theme}` : ''}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgb(100, 116, 139)',
                  marginBottom: '0.5rem'
                }}>
                  {new Date(s.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  fontSize: '0.875rem',
                  color: 'rgb(100, 116, 139)'
                }}>
                  <span>👁️ {s.views} views</span>
                  <span>⭐ {s.rating}/5</span>
                </div>
              </div>
              <a 
                className="btn btn-primary" 
                href={s.link} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                ▶ Watch
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

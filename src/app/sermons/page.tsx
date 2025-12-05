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
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Sermons</h1>
      <div className="grid gap-3">
        {deduped.map(s => (
          <div key={s.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm">{s.speaker} — {(s as any).theme ? `${(s as any).theme} · ` : ''}{new Date(s.date).toDateString()}</div>
              <div className="text-sm">Views: {s.views} · Rating: {s.rating}</div>
            </div>
            <a className="btn" href={s.link} target="_blank" rel="noopener noreferrer">Watch</a>
          </div>
        ))}
      </div>
    </div>
  );
}

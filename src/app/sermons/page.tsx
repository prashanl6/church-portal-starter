import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function SermonsPage() {
  const sermons = await prisma.sermon.findMany({ orderBy: { date: 'desc' } });
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Sermons</h1>
      <div className="grid gap-3">
        {sermons.map(s => (
          <div key={s.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm">{s.speaker} — {new Date(s.date).toDateString()}</div>
              <div className="text-sm">Views: {s.views} · Rating: {s.rating}</div>
            </div>
            <a className="btn" href={s.link} target="_blank">Watch</a>
          </div>
        ))}
      </div>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import type { ChurchIndividual, WeddingAnniversary } from '@prisma/client';
import { sameMonthDay } from '@/lib/peopleUpcoming';

const SNAPSHOT_START = '<!-- church-portal-people-snapshot:start -->';
const SNAPSHOT_END = '<!-- church-portal-people-snapshot:end -->';

/** Monday 00:00 through end of `weekOf` day (inclusive), local time. */
export function getSnapshotRangeForWeekOf(weekOf: Date): { start: Date; end: Date } {
  const end = new Date(weekOf);
  end.setHours(23, 59, 59, 999);

  const start = new Date(weekOf);
  const day = start.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + delta);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function* eachCalendarDayInRange(start: Date, end: Date): Generator<Date> {
  const cur = new Date(start);
  cur.setHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);
  while (cur.getTime() <= last.getTime()) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function stripNoticePeopleSnapshot(html: string): string {
  const re = new RegExp(
    `${SNAPSHOT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${SNAPSHOT_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  return html.replace(re, '').trimEnd();
}

type AnnWithPeople = WeddingAnniversary & {
  individualA: ChurchIndividual;
  individualB: ChurchIndividual;
};

function buildSnapshotHtmlFromData(
  birthdayRows: ChurchIndividual[],
  anniversariesDb: AnnWithPeople[],
  start: Date,
  end: Date
): string {
  const birthdaySeen = new Map<number, { name: string; birth: Date; sort: number }>();
  for (const day of eachCalendarDayInRange(start, end)) {
    for (const ind of birthdayRows) {
      if (!ind.birthDate) continue;
      if (sameMonthDay(ind.birthDate, day) && !birthdaySeen.has(ind.id)) {
        birthdaySeen.set(ind.id, {
          name: ind.displayName,
          birth: ind.birthDate,
          sort: day.getTime()
        });
      }
    }
  }

  const birthdaysSorted = [...birthdaySeen.values()].sort((a, b) =>
    a.sort !== b.sort ? a.sort - b.sort : a.name.localeCompare(b.name)
  );

  const annSeen = new Map<
    number,
    { nameA: string; nameB: string; ann: Date; sort: number; notes: string | null }
  >();
  for (const day of eachCalendarDayInRange(start, end)) {
    for (const ann of anniversariesDb) {
      if (sameMonthDay(ann.anniversaryDate, day) && !annSeen.has(ann.id)) {
        annSeen.set(ann.id, {
          nameA: ann.individualA.displayName,
          nameB: ann.individualB.displayName,
          ann: ann.anniversaryDate,
          sort: day.getTime(),
          notes: ann.notes
        });
      }
    }
  }

  const annSorted = [...annSeen.values()].sort((a, b) =>
    a.sort !== b.sort ? a.sort - b.sort : `${a.nameA} ${a.nameB}`.localeCompare(`${b.nameA} ${b.nameB}`)
  );

  const birthdayItems = birthdaysSorted
    .map(
      (row) =>
        `<li>${escapeHtml(row.name)} — ${escapeHtml(formatLongDate(row.birth))}</li>`
    )
    .join('');

  const annItems = annSorted
    .map((row) => {
      const note = row.notes
        ? ` <span style="color:#64748b;font-size:0.9rem;">(${escapeHtml(row.notes)})</span>`
        : '';
      return `<li>${escapeHtml(row.nameA)} &amp; ${escapeHtml(row.nameB)} — ${escapeHtml(
        formatLongDate(row.ann)
      )}${note}</li>`;
    })
    .join('');

  const inner = `
<div class="notice-people-snapshot" style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;">
  <h3 style="font-size:1.1rem;margin-bottom:0.5rem;">Birthdays this week</h3>
  ${
    birthdayItems
      ? `<ul style="margin:0 0 1rem 1.1rem;padding:0;">${birthdayItems}</ul>`
      : '<p style="margin:0 0 1rem 0;color:#64748b;font-size:0.95rem;">No birthdays in this period.</p>'
  }
  <h3 style="font-size:1.1rem;margin-bottom:0.5rem;">Anniversaries this week</h3>
  ${
    annItems
      ? `<ul style="margin:0;padding:0 0 0 1.1rem;">${annItems}</ul>`
      : '<p style="margin:0;color:#64748b;font-size:0.95rem;">No anniversaries in this period.</p>'
  }
</div>`.trim();

  return `${SNAPSHOT_START}\n${inner}\n${SNAPSHOT_END}`;
}

/** Single notice: loads people data from DB. */
export async function hydrateNoticeBodyWithPeopleSnapshot(
  bodyHtml: string,
  weekOf: Date
): Promise<string> {
  const [birthdayRows, anniversariesDb] = await Promise.all([
    prisma.churchIndividual.findMany({
      where: {
        status: 'active',
        dateOfDeath: null,
        birthDate: { not: null }
      }
    }),
    prisma.weddingAnniversary.findMany({
      where: {
        status: 'active',
        individualA: { status: 'active' },
        individualB: { status: 'active' }
      },
      include: {
        individualA: true,
        individualB: true
      }
    })
  ]);

  const { start, end } = getSnapshotRangeForWeekOf(weekOf);
  const block = buildSnapshotHtmlFromData(birthdayRows, anniversariesDb, start, end);
  return `${stripNoticePeopleSnapshot(bodyHtml)}\n${block}`;
}

export type NoticeLike = { bodyHtml: string; weekOf: Date };

/** Multiple notices: one DB round-trip for people data, then hydrate each body. */
export async function hydrateNoticeBodiesWithPeopleSnapshot<T extends NoticeLike>(
  notices: T[]
): Promise<(T & { bodyHtml: string })[]> {
  if (notices.length === 0) return [];

  const [birthdayRows, anniversariesDb] = await Promise.all([
    prisma.churchIndividual.findMany({
      where: {
        status: 'active',
        dateOfDeath: null,
        birthDate: { not: null }
      }
    }),
    prisma.weddingAnniversary.findMany({
      where: {
        status: 'active',
        individualA: { status: 'active' },
        individualB: { status: 'active' }
      },
      include: {
        individualA: true,
        individualB: true
      }
    })
  ]);

  return notices.map((n) => {
    const { start, end } = getSnapshotRangeForWeekOf(n.weekOf);
    const block = buildSnapshotHtmlFromData(birthdayRows, anniversariesDb, start, end);
    return {
      ...n,
      bodyHtml: `${stripNoticePeopleSnapshot(n.bodyHtml)}\n${block}`
    };
  });
}

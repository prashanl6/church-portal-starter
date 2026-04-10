/**
 * Idempotent: migrates wedding_anniversary rows from _LegacyPeopleEvent, then drops the table.
 * Run after `prisma migrate deploy` (see migration20260410123000_church_individuals_anniversaries).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function splitCoupleName(personName) {
  const name = (personName || '').trim();
  if (!name) return { a: 'Unknown', b: 'Unknown' };
  const amp = name.split(/\s*&\s*/);
  if (amp.length >= 2) {
    return { a: amp[0].trim() || 'Unknown', b: amp.slice(1).join(' & ').trim() || 'Unknown' };
  }
  const and = name.split(/\s+and\s+/i);
  if (and.length >= 2) {
    return { a: and[0].trim() || 'Unknown', b: and.slice(1).join(' and ').trim() || 'Unknown' };
  }
  return { a: name, b: `${name} (partner)` };
}

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_LegacyPeopleEvent'
  `;
  if (!Array.isArray(tables) || tables.length === 0) {
    return;
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "_LegacyPeopleEvent" WHERE "type" = 'wedding_anniversary'`
  );

  for (const r of rows) {
    const { a, b } = splitCoupleName(r.personName);
    const anniversaryDate = new Date(r.date);
    const status = r.status || 'active';

    const indA = await prisma.churchIndividual.create({
      data: {
        displayName: a,
        birthDate: null,
        email: r.email || null,
        phone: r.phone || null,
        notes: null,
        dateOfDeath: r.dateOfDeath ? new Date(r.dateOfDeath) : null,
        status
      }
    });
    const indB = await prisma.churchIndividual.create({
      data: {
        displayName: b,
        birthDate: null,
        email: null,
        phone: null,
        notes: null,
        dateOfDeath: null,
        status: 'active'
      }
    });

    await prisma.weddingAnniversary.create({
      data: {
        individualAId: indA.id,
        individualBId: indB.id,
        anniversaryDate,
        notes: r.notes || null,
        status
      }
    });
  }

  await prisma.$executeRawUnsafe(`DROP TABLE "_LegacyPeopleEvent"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

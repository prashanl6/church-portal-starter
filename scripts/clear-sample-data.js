/**
 * ONE-TIME cleanup for before launch: removes the sample people, anniversaries, notices, sermons,
 * assets, medical items and loans, and hall bookings (with their payment slips), plus their
 * approvals and audit entries.
 *
 * KEEPS: administrator and staff accounts, the hall rate, bank account details (live and proposed),
 * every process guide, and the welcome notice.
 *
 * Runs only when CLEAR_SAMPLE_DATA is exactly "delete-all-sample-data" (see HOSTING_AND_OPERATIONS.md).
 * Run it BEFORE entering real information, then remove that setting. It cannot be undone.
 *
 *   CLEAR_SAMPLE_DATA=delete-all-sample-data node scripts/clear-sample-data.js
 */
require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();
const { PrismaClient } = require('@prisma/client');

const CONFIRM = 'delete-all-sample-data';
if (process.env.CLEAR_SAMPLE_DATA !== CONFIRM) {
  console.log('[clear-sample-data] not requested (CLEAR_SAMPLE_DATA is not set); nothing deleted.');
  process.exit(0);
}

const prisma = new PrismaClient();
const CLEARED_TYPES = ['notice', 'sermon', 'individual', 'anniversary', 'asset', 'booking', 'medical_item', 'medical_loan'];

async function main() {
  const out = await prisma.$transaction(async (tx) => {
    const n = {};
    n.sermons = (await tx.sermon.deleteMany({})).count; // ratings go with them
    n.anniversaries = (await tx.weddingAnniversary.deleteMany({})).count;
    n.people = (await tx.churchIndividual.deleteMany({})).count;
    n.assets = (await tx.asset.deleteMany({})).count;
    n.loans = (await tx.medicalLoan.deleteMany({})).count;
    n.medicalItems = (await tx.medicalItem.deleteMany({})).count;
    n.bookings = (await tx.booking.deleteMany({})).count;
    n.slips = (await tx.storedFile.deleteMany({ where: { kind: 'booking_slip' } })).count;
    n.notices = (await tx.notice.deleteMany({ where: { NOT: { title: 'Welcome to our new church website' } } })).count;
    // Practice guides made while testing (titles start with "ZZ TEST"); the real guides are kept.
    const practice = await tx.processDoc.findMany({ where: { title: { startsWith: 'ZZ TEST' } }, select: { id: true } });
    if (practice.length) {
      await tx.approval.deleteMany({ where: { resourceType: 'process', resourceId: { in: practice.map((p) => p.id) } } });
      n.practiceGuides = (await tx.processDoc.deleteMany({ where: { id: { in: practice.map((p) => p.id) } } })).count;
    }
    n.approvals = (await tx.approval.deleteMany({ where: { resourceType: { in: CLEARED_TYPES } } })).count;
    n.audit = (await tx.auditLog.deleteMany({ where: { resourceType: { in: CLEARED_TYPES } } })).count;
    return n;
  });
  console.log('[clear-sample-data] deleted:', JSON.stringify(out));
  console.log('[clear-sample-data] kept: accounts, hall rate, bank account, process guides, welcome notice.');
}

main()
  .catch((e) => {
    console.error('[clear-sample-data] failed; nothing was changed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Reference data a brand-new site needs so a first-time visitor sees something useful.
 *
 * Safe to run on every production build: it only ADDS what is missing and never changes
 * anything an administrator has already set (rates, processes, notices).
 * It creates no user accounts (admins are created with the first-time setup on /login).
 *
 *   node scripts/seed-reference-data.js
 */
require('./load-env-from-dotenv.cjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SYSTEM_EMAIL = 'system@church.local';
const HALL_RATE_PER_30_MIN = 1500; // LKR. Admins change it under Admin → Hall bookings.

const FILES = path.join(__dirname, '..', 'prisma', 'reference-files');
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ol = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const PROCESSES = [
  {
    title: 'Booking the church hall or chapel',
    audience: 'public',
    html:
      `<p>Anyone can ask to use the <strong>Main Hall</strong> or the <strong>Chapel</strong>. Bookings are between 8:00 a.m. and 10:00 p.m.</p>` +
      `<h2>Steps</h2>` +
      ol([
        'Open <strong>Book the Hall</strong> from the menu.',
        'Fill in your name, email, phone number and what the booking is for.',
        'Choose the hall, the date, and the start and end time. The page shows the estimated cost.',
        'Press <strong>Submit Request</strong>. Write down the booking reference shown on the screen.',
        'An administrator checks your request. You will receive an email when it is approved, with the amount to pay.',
      ]) +
      `<h2>Good to know</h2>` +
      ul([
        'The hall is charged in 30-minute blocks. Part of a block counts as a full block.',
        'Dates already booked are listed on the booking page, so please choose a free time.',
        'If you have questions, please contact the church office.',
      ]),
  },
  {
    title: 'Paying for a hall booking',
    audience: 'public',
    html:
      `<p>Once your booking is approved you have until <strong>one hour before the booking starts</strong> to pay. Unpaid bookings are cancelled automatically.</p>` +
      `<h2>Steps</h2>` +
      ol([
        'Pay the amount shown in your approval email into the church bank account given in that email.',
        'Open your booking page (the link in the email, or <em>/booking/your-reference</em>).',
        'Enter the payment reference from your bank and upload a photo or PDF of the payment slip (up to 4 MB).',
        'An administrator checks the slip and marks the booking as <strong>Booked and paid</strong>.',
      ]) +
      `<p>Paid bookings cannot be cancelled.</p>`,
  },
  {
    title: 'Borrowing medical equipment',
    audience: 'public',
    html:
      `<p>The church lends wheelchairs, walkers and other aids to members and their families.</p>` +
      ol([
        'Speak to a steward or the church office and say what you need and for how long.',
        'A steward records the loan with your name and the date it should come back.',
        'An administrator approves the loan, then the item is handed over.',
        'Bring the item back clean and on time. The steward marks it as returned.',
      ]),
  },
  {
    title: 'Opening and closing the hall',
    audience: 'steward',
    file: 'hall-open-close-checklist.xlsx',
    html:
      `<p>For the steward on duty when the hall is booked. Download the checklist below, print it, and tick each step.</p>` +
      `<h2>Opening</h2>` +
      ol([
        'Check the booking in <strong>Admin → Hall bookings</strong> is <strong>Booked and paid</strong>.',
        'Collect the keys from the church office.',
        'Unlock, switch on lights and fans, and set out chairs and tables.',
        'Show the organiser the fire exits.',
      ]) +
      `<h2>Closing</h2>` +
      ol([
        'Check the hall is clean and chairs and tables are stacked.',
        'Switch everything off, close windows and lock all doors.',
        'Return the keys and report any damage to the office.',
      ]),
  },
  {
    title: 'Counting the Sunday offering',
    audience: 'steward',
    file: 'offering-count-sheet.xlsx',
    html:
      `<p>Two stewards always count the offering together. Download the count sheet below; it adds up the totals for you.</p>` +
      ol([
        'Count in the vestry straight after the service, with the door closed.',
        'Count notes and coins separately and enter the number of each in the sheet.',
        'Add cheques and envelope totals. Check the grand total together.',
        'Both stewards sign the sheet. Seal the money and sheet in the deposit bag.',
        'Bank it on the next working day and write the deposit reference on the sheet.',
      ]),
  },
  {
    title: 'Publishing the weekly notices',
    audience: 'steward',
    html:
      `<p>Every change on the website needs two administrators: one writes it, a different one approves it.</p>` +
      ol([
        'Go to <strong>Admin → Notices</strong> and write the notice for the coming week. Use the toolbar for bold text, lists and pictures.',
        'Press <strong>Submit for Approval</strong>.',
        'A second administrator opens <strong>Admin → Approvals</strong>, reads it and presses <strong>Approve</strong> (or <strong>Reject</strong> with a reason).',
        'Once approved, the notice appears on the website straight away, together with that week’s birthdays and anniversaries.',
      ]),
  },
  {
    title: 'Adding a Sunday sermon',
    audience: 'steward',
    html: ol([
      'Open the sermon video on Facebook and copy the address from the browser bar.',
      'Go to <strong>Admin → Sermons</strong>, choose the Sunday, and enter the title, speaker and link.',
      'Press <strong>Submit for Approval</strong>. A second administrator approves it in <strong>Admin → Approvals</strong>.',
      'The sermon then appears on the Sermons page. Its rating is the number of times it has been viewed.',
    ]),
  },
  {
    title: 'Recording a birthday, anniversary or death',
    audience: 'steward',
    html:
      ol([
        'Go to <strong>Admin → Birthdays &amp; anniversaries</strong>.',
        'Add the person with their date of birth, or add the couple with their wedding date.',
        'When a member passes away, open their details, enter the date of death and save.',
        'A second administrator approves the change in <strong>Admin → Approvals</strong>.',
      ]) + `<p>Birthdays and anniversaries for each week are added to that week’s notices automatically.</p>`,
  },
  {
    title: 'Adding or removing church assets',
    audience: 'steward',
    html: ol([
      'Go to <strong>Admin → Assets</strong>.',
      'Enter what it is (for example “Wireless microphone”), the value of one item, how many there are and where it belongs (Chapel, Main Hall and so on).',
      'Press save. The asset is listed under <em>Waiting for approval</em> until a second administrator approves it.',
      'To change or remove an asset, use Edit or Delete. These also need a second administrator.',
    ]),
  },
  {
    title: 'Approving changes as the second administrator',
    audience: 'steward',
    html:
      ol([
        'A number next to <strong>Admin</strong> in the menu shows how many changes are waiting.',
        'Open <strong>Admin → Approvals</strong>. Each card shows who asked, when, and exactly what will change.',
        'Press <strong>Approve</strong> if it is correct. Press <strong>Reject</strong> and give a reason if it is not.',
      ]) + `<p>You cannot approve your own changes. Staff accounts can look but cannot approve.</p>`,
  },
];

function lastSunday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

async function systemUser() {
  let u = await prisma.user.findUnique({ where: { email: SYSTEM_EMAIL } });
  if (!u) {
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    u = await prisma.user.create({
      data: { name: 'Website (public request)', email: SYSTEM_EMAIL, passwordHash: hash, role: 'guest', status: 'disabled' },
    });
  }
  return u;
}

async function main() {
  const system = await systemUser();
  const firstAdmin = await prisma.user.findFirst({ where: { role: 'admin', status: 'active' }, orderBy: { id: 'asc' } });
  const owner = firstAdmin || system;
  const log = (action, resourceType, resourceId, after) =>
    prisma.auditLog.create({
      data: {
        actorId: system.id,
        action,
        resourceType,
        resourceId,
        afterJson: JSON.stringify(after),
        status: 'approved',
        theme: 'Initial reference data',
      },
    });
  const done = [];

  // Hall rate: only when not set yet (0 means "never set").
  const rate = await prisma.hallBookingSettings.findUnique({ where: { id: 1 } });
  if (!rate || !rate.ratePer30Minutes) {
    await prisma.hallBookingSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ratePer30Minutes: HALL_RATE_PER_30_MIN },
      update: { ratePer30Minutes: HALL_RATE_PER_30_MIN },
    });
    await log('seed_rate', 'hall_settings', 1, { ratePer30Minutes: HALL_RATE_PER_30_MIN });
    done.push(`hall rate LKR ${HALL_RATE_PER_30_MIN} per 30 minutes`);
  }

  // Process guides: add any whose title does not exist yet.
  for (const p of PROCESSES) {
    const exists = await prisma.processDoc.findFirst({ where: { title: p.title } });
    if (exists) continue;
    const doc = await prisma.processDoc.create({
      data: { title: p.title, ownerUserId: owner.id, contentHtml: p.html, audience: p.audience, status: 'published', version: 1 },
    });
    if (p.file) {
      const data = fs.readFileSync(path.join(FILES, p.file));
      const stored = await prisma.storedFile.create({
        data: { kind: 'process_attachment', fileName: p.file, mimeType: XLSX, byteSize: data.length, data },
      });
      await prisma.processAttachment.create({
        data: {
          processDocId: doc.id,
          fileName: p.file,
          storedPath: `/api/files/${stored.id}`,
          mimeType: XLSX,
          byteSize: data.length,
          fileId: stored.id,
          status: 'active',
        },
      });
    }
    await log('seed_process', 'process', doc.id, { title: p.title, audience: p.audience });
    done.push(`process "${p.title}"`);
  }

  // A welcome notice, only on a site that has never had a notice.
  if ((await prisma.notice.count()) === 0) {
    const n = await prisma.notice.create({
      data: {
        title: 'Welcome to our new church website',
        weekOf: lastSunday(),
        status: 'published',
        bodyHtml:
          '<p>Welcome! On this website you can:</p>' +
          ul([
            'read each week’s <strong>notices</strong>, including birthdays and anniversaries,',
            'watch <strong>sermons</strong> again,',
            'ask to <strong>book the Main Hall or Chapel</strong>, and',
            'read our <strong>church processes</strong>.',
          ]) +
          '<p>Use the menu at the top of every page. If anything is unclear, please speak to the church office.</p>',
      },
    });
    await log('seed_notice', 'notice', n.id, { title: n.title });
    done.push('welcome notice');
  }

  console.log(done.length ? `Reference data added: ${done.join('; ')}.` : 'Reference data already present; nothing to add.');
}

main()
  .catch((e) => {
    console.error('Reference data seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

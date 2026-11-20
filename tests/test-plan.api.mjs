/**
 * Runs the Church Portal test plan (every ID from SEC-01 to PRF-01) against a running site.
 *
 *   Reset and seed the local test database, then:
 *   BASE_URL=http://localhost:3000 node tests/test-plan.api.mjs
 *
 * Uses the demo accounts from scripts/seed.js + scripts/seed-extra-staff-admins.js and the
 * sample files in tests/fixtures/. Never run it against the live site.
 * Prints one line per test ID and a summary; exits 1 if any test fails.
 */
import { readFileSync } from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  console.error('Refusing to run: this suite creates test data and must only target a local site.');
  process.exit(2);
}
const FIX = new URL('./fixtures/', import.meta.url);
const results = [];
let current = null;

function test(id, title) {
  current = { id, title, checks: [] };
  results.push(current);
}
function ok(cond, label, extra = '') {
  current.checks.push({ pass: !!cond, label, extra: cond ? '' : extra });
}

async function call(path, { cookie, method = 'GET', json, form } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let body;
  if (json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) body = form;
  const res = await fetch(BASE + path, { method, headers, body, redirect: 'manual' });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function login(email, password) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const m = (res.headers.get('set-cookie') || '').match(/token=[^;]+/);
  return { status: res.status, cookie: m ? m[0] : null, data: await res.json().catch(() => null) };
}

const file = (name, type) => new Blob([readFileSync(new URL(name, FIX))], { type });
const j = (x) => String(JSON.stringify(x) ?? x).slice(0, 300);
const pendingFor = async (cookie, type) =>
  (await call('/api/approvals', { cookie })).data.list.filter((a) => a.status === 'SUBMITTED' && a.resourceType === type);
const approve = (cookie, approvalId) => call('/api/approvals/approve', { cookie, method: 'POST', json: { approvalId } });
const reject = (cookie, approvalId, comment) => call('/api/approvals/reject', { cookie, method: 'POST', json: { approvalId, comment } });
const ymd = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- SEC
test('SEC-01', 'Every account can log in');
const accounts = [
  ['admin1@example.com', 'Admin@123'], ['admin2@example.com', 'Admin@123'], ['admin3@example.com', 'Admin@123'],
  ['admin4@example.com', 'Admin@123'], ['staff@example.com', 'Staff@123'], ['staff2@example.com', 'Staff@123'],
  ['staff3@example.com', 'Staff@123'],
];
const S = {};
for (const [email, pw] of accounts) {
  const r = await login(email, pw);
  ok(r.status === 200 && r.cookie, `${email} logs in`, `${r.status} ${j(r.data)}`);
  S[email.split('@')[0]] = r.cookie;
}
const { admin1, admin2, admin3, staff, staff2 } = S;
const me = await call('/api/auth/check', { cookie: admin1 });
ok(me.status === 200 && me.data.role === 'admin' && me.data.name, 'logged-in user name and role are returned', j(me.data));

test('SEC-02', 'Admin pages need login');
const redirect = await call('/admin/approvals');
ok([307, 308].includes(redirect.status) && /\/login\?next=/.test(redirect.headers.get('location') || ''), 'logged-out visit is sent to the login page', `${redirect.status} ${redirect.headers.get('location')}`);
ok((await call('/api/approvals')).status === 401, 'approvals API refuses anonymous calls');
ok((await call('/api/admin/notices')).status === 401, 'draft notices are not public');
ok((await call('/api/admin/sermons')).status === 401, 'unapproved sermons are not public');

test('SEC-03', 'Internal account blocked');
const sys = await login('system@church.local', 'system');
ok(sys.status === 401 && /not correct/i.test(sys.data?.message || sys.data?.error || ''), 'system account cannot log in', j(sys.data));

test('SEC-05', 'Staff can view, not approve');
const bank0 = await call('/api/admin/church-bank-account', { cookie: admin1 });
const bankBefore = bank0.data.live;

// ---------------------------------------------------------------- FIN
test('FIN-01', 'Bank details need approval');
const bankBody = { accountNumber: '1234567890', accountName: "St. Mark's Church", bankName: 'Bank of Ceylon', branch: 'Colombo 03' };
let r = await call('/api/admin/church-bank-account', { cookie: admin1, method: 'POST', json: bankBody });
ok(r.status === 200, 'proposal accepted', `${r.status} ${j(r.data)}`);
const bank1 = (await call('/api/admin/church-bank-account', { cookie: admin1 })).data;
ok(bank1.pendingProposal && bank1.pendingProposal.accountNumber === '1234567890', 'shows as change pending approval', j(bank1));
ok(JSON.stringify(bank1.live) === JSON.stringify(bankBefore), 'currently published details unchanged');

test('FIN-02', 'Maker cannot approve own change');
const bankAp = (await pendingFor(admin1, 'church_bank_account'))[0];
ok(bankAp && bankAp.isMine === true && bankAp.canAct === false, 'maker sees "You made this request" (no approve)', j(bankAp));
ok((await approve(admin1, bankAp?.id)).status === 403, 'maker approval is refused');

// SEC-05 continues: staff sees the item but cannot act
current = results.find((t) => t.id === 'SEC-05');
const staffView = (await pendingFor(staff, 'church_bank_account'))[0];
ok(staffView && staffView.canAct === false, 'staff can see pending items without approve rights', j(staffView));
ok((await approve(staff, bankAp?.id)).status === 403, 'staff approval is refused');

current = results.find((t) => t.id === 'FIN-02');
test('FIN-03', 'Checker approves');
r = await approve(admin2, bankAp?.id);
ok(r.status === 200, 'admin2 approves', `${r.status} ${j(r.data)}`);
const bank2 = (await call('/api/admin/church-bank-account', { cookie: admin1 })).data;
ok(bank2.live?.accountNumber === '1234567890' && !bank2.pendingProposal, 'new details are published', j(bank2));
ok((await approve(admin2, bankAp?.id)).status === 409, 'cannot approve the same request twice');

test('FIN-04', 'Hall rate needs approval');
const rateBefore = (await call('/api/admin/hall-booking-settings', { cookie: admin1 })).data.ratePer30Minutes;
r = await call('/api/admin/hall-booking-settings', { cookie: admin1, method: 'PATCH', json: { ratePer30Minutes: 2000 } });
ok(r.status === 200 && r.data.pending, 'rate change sent for approval', j(r.data));
ok((await call('/api/bookings/pricing')).data.ratePer30Minutes === rateBefore, 'old rate still applies', String(rateBefore));

test('FIN-05', 'Rate applies after approval');
const rateAp = (await pendingFor(admin2, 'hall_settings'))[0];
ok((await approve(admin2, rateAp?.id)).status === 200, 'admin2 approves the rate');
ok((await call('/api/bookings/pricing')).data.ratePer30Minutes === 2000, 'public price list shows the new rate');
// put the reference rate back for the booking tests (LKR 1,500 → 4 blocks = 6,000)
await call('/api/admin/hall-booking-settings', { cookie: admin1, method: 'PATCH', json: { ratePer30Minutes: 1500 } });
await approve(admin2, (await pendingFor(admin2, 'hall_settings'))[0]?.id);
ok((await call('/api/bookings/pricing')).data.ratePer30Minutes === 1500, 'rate set back to 1500 through approval');

test('FIN-06', 'Staff cannot change rate');
r = await call('/api/admin/hall-booking-settings', { cookie: staff, method: 'PATCH', json: { ratePer30Minutes: 1 } });
ok(r.status === 403 && /only administrators/i.test(r.data.error), 'refused with a clear message', j(r.data));

// ---------------------------------------------------------------- AST
const stamp = Date.now();
const assetRef = `Wireless microphone ${stamp}`;
test('AST-01', 'New asset waits');
const asset = await call('/api/admin/assets', { cookie: admin1, method: 'POST', json: { reference: assetRef, value: 25000, quantity: 2, labelCategory: 'Sound Equipment', status: 'active', id: 999999 } });
ok(asset.status === 200, 'asset submitted', j(asset.data));
const assetRow = async () => (await call('/api/admin/assets', { cookie: admin1 })).data.list.find((x) => x.id === asset.data.id);
ok((await assetRow())?.status === 'pending', 'listed as pending, extra fields ignored');

test('AST-02', 'Asset approved');
ok((await approve(admin2, (await pendingFor(admin2, 'asset')).find((x) => x.resourceId === asset.data.id)?.id)).status === 200, 'admin2 approves');
ok((await assetRow())?.status === 'active', 'asset is now approved');

test('AST-03', 'Edit waits for approval');
r = await call(`/api/admin/assets/${asset.data.id}`, { cookie: admin1, method: 'PATCH', json: { quantity: 3 } });
ok(r.status === 200, 'edit submitted', j(r.data));
ok((await assetRow())?.quantity === 2, 'quantity still 2 before approval');
const editAp = (await pendingFor(admin2, 'asset')).find((x) => x.resourceId === asset.data.id);
ok(editAp && JSON.stringify(editAp).includes('3'), 'approval shows the new value', j(editAp));
await approve(admin2, editAp?.id);
ok((await assetRow())?.quantity === 3, 'quantity 3 after approval');

test('AST-04', 'Delete waits for approval');
r = await call(`/api/admin/assets/${asset.data.id}`, { cookie: admin1, method: 'DELETE' });
ok(r.status === 200, 'delete submitted', j(r.data));
ok(!!(await assetRow()), 'still listed before approval');
await approve(admin2, (await pendingFor(admin2, 'asset')).find((x) => x.resourceId === asset.data.id)?.id);
const goneRow = await assetRow();
ok(!goneRow || goneRow.status === 'deleted', 'gone after approval', j(goneRow));

test('AST-05', 'Staff cannot add assets');
r = await call('/api/admin/assets', { cookie: staff, method: 'POST', json: { reference: 'x', value: 1, quantity: 1, labelCategory: 'Chapel' } });
ok(r.status === 403 && /only administrators/i.test(r.data.error), 'refused with a clear message', j(r.data));

// ---------------------------------------------------------------- PPL
const people = [
  { displayName: `Grace Fernando ${stamp}`, birthDate: '1948-11-22', phone: '0771234567' },
  { displayName: `Sunil Perera ${stamp}`, birthDate: '1950-01-03' },
  { displayName: `Rohan Silva ${stamp}`, birthDate: '1946-05-10' },
];
const listPeople = async () => (await call('/api/admin/individuals?pageSize=200', { cookie: admin1 })).data.list || [];
test('PPL-01', 'New people wait');
for (const p of people) {
  r = await call('/api/admin/individuals', { cookie: admin1, method: 'POST', json: p });
  ok(r.status === 200, `${p.displayName.split(' ')[0]} submitted`, j(r.data));
}
let reg = await listPeople();
ok(!people.some((p) => reg.some((x) => x.displayName === p.displayName)), 'not in the register before approval');

test('PPL-02', 'People approved');
const personAps = (await pendingFor(admin2, 'individual')).filter((a) => JSON.stringify(a.genericDetails || {}).includes(String(stamp)));
ok(personAps.length === 3 && personAps.every((a) => JSON.stringify(a.genericDetails).match(/19\d\d/)), 'approvals show name and date of birth', j(personAps[0]?.genericDetails));
for (const a of personAps) await approve(admin2, a.id);
reg = await listPeople();
const byName = (n) => reg.find((x) => x.displayName.startsWith(n));
ok(people.every((p) => reg.some((x) => x.displayName === p.displayName)), 'all three appear in the register');

test('PPL-03', 'Anniversary approved');
r = await call('/api/admin/anniversaries', { cookie: admin1, method: 'POST', json: { individualAId: byName('Grace Fernando')?.id, individualBId: byName('Sunil Perera')?.id, anniversaryDate: '1972-11-23' } });
ok(r.status === 200, 'anniversary submitted', j(r.data));
ok((await approve(admin2, (await pendingFor(admin2, 'anniversary')).slice(-1)[0]?.id)).status === 200, 'admin2 approves');
const anns = (await call('/api/admin/anniversaries?pageSize=200', { cookie: admin1 })).data.list || [];
ok(anns.some((x) => JSON.stringify(x).includes(`Grace Fernando ${stamp}`)), 'appears under Anniversaries', j(anns.slice(0, 1)));

test('PPL-04', 'Deceased needs a date');
const rohan = byName('Rohan Silva');
r = await call(`/api/admin/individuals/${rohan?.id}`, { cookie: admin1, method: 'PATCH', json: { status: 'inactive' } });
ok(r.status === 400 && /date of death/i.test(r.data.error), 'asks for the date of death', j(r.data));

test('PPL-05', 'Record a death');
r = await call(`/api/admin/individuals/${rohan?.id}`, { cookie: admin1, method: 'PATCH', json: { dateOfDeath: '2026-11-01' } });
ok(r.status === 200, 'date of death submitted', j(r.data));
await approve(admin2, (await pendingFor(admin2, 'individual')).find((a) => a.resourceId === rohan?.id)?.id);
const inactive = (await call('/api/admin/individuals?status=inactive&pageSize=200', { cookie: admin1 })).data.list || [];
ok(inactive.some((x) => x.id === rohan?.id && String(x.dateOfDeath || '').startsWith('2026-11-01')), 'moves to Deactivated with the date', j(inactive.find((x) => x.id === rohan?.id)));

test('PPL-06', 'Staff cannot change register');
r = await call('/api/admin/individuals', { cookie: staff, method: 'POST', json: { displayName: 'X', birthDate: '1950-01-01' } });
ok(r.status === 403 && /only administrators/i.test(r.data.error), 'refused with a clear message', j(r.data));

// ---------------------------------------------------------------- NTC
const noticeIn = async (id) => (await call('/api/notices')).data.list.find((x) => x.id === id);
test('NTC-01', 'Notice hidden until approved');
const n1 = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: `Christmas carol practice ${stamp}`, bodyHtml: '<p>Practice every Saturday at 4 pm in the Chapel.</p>', weekOf: '2026-11-22T00:00:00.000Z' } });
ok(n1.status === 200, 'notice submitted', j(n1.data));
ok(!(await noticeIn(n1.data.id)), 'not shown publicly');

test('NTC-02', 'Notice published');
ok((await approve(admin2, (await pendingFor(admin2, 'notice')).find((a) => a.resourceId === n1.data.id)?.id)).status === 200, 'admin2 approves');
const pubN1 = await noticeIn(n1.data.id);
ok(!!pubN1, 'shown at once (no caching)');
ok(pubN1 && pubN1.bodyHtml.includes(`Grace Fernando ${stamp}`), "includes Grace's birthday / anniversary for that week", pubN1?.bodyHtml?.slice(-400));

test('NTC-03', 'Formatting kept, harmful code removed');
const fancy = '<h2>Harvest</h2><p><strong>Bold</strong></p><ul><li>One</li><li>Two</li></ul><p><img src="data:image/png;base64,iVBORw0KGgo="></p><img src=x onerror="alert(1)"><script>alert(2)</script>';
const n2 = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: `Formatting ${stamp}`, bodyHtml: fancy, weekOf: '2026-11-22T00:00:00.000Z' } });
await approve(admin2, (await pendingFor(admin2, 'notice')).find((a) => a.resourceId === n2.data.id)?.id);
const pubN2 = await noticeIn(n2.data.id);
ok(pubN2 && /<strong>Bold<\/strong>/.test(pubN2.bodyHtml) && /<li>Two<\/li>/.test(pubN2.bodyHtml) && /<img/.test(pubN2.bodyHtml), 'bold, list and picture kept', pubN2?.bodyHtml);
ok(pubN2 && !/onerror|<script/i.test(pubN2.bodyHtml), 'scripts and event handlers removed');

test('NTC-04', 'Rejection needs a reason');
const n3 = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: `Wrong week ${stamp}`, bodyHtml: '<p>x</p>', weekOf: '2026-11-22T00:00:00.000Z' } });
const n3Ap = (await pendingFor(admin2, 'notice')).find((a) => a.resourceId === n3.data.id);
r = await reject(admin2, n3Ap?.id, '');
ok(r.status === 400 && /reason/i.test(r.data.error), 'asks for a reason first', j(r.data));
ok((await reject(admin2, n3Ap?.id, 'Wrong week')).status === 200, 'rejected with a reason');
ok(!(await noticeIn(n3.data.id)), 'never shown publicly');

// ---------------------------------------------------------------- SRM
const sermonsPublic = async () => (await call('/api/sermons')).data.list;
const sunday = '2026-11-15';
await call('/api/admin/sermons', { cookie: admin1, method: 'GET' }); // warm
test('SRM-01', 'Sermon published after approval');
const existingSermon = (await call('/api/admin/sermons', { cookie: admin1 })).data.list.find((s) => String(s.date).startsWith(sunday));
let sermonId = existingSermon?.id;
if (!existingSermon) {
  r = await call('/api/admin/sermons', { cookie: admin1, method: 'POST', json: { title: 'Faith in hard times', speaker: 'Rev. Jayasuriya', theme: '', link: 'https://www.facebook.com/watch/?v=123', date: sunday, dateIso: sunday } });
  ok(r.status === 200, 'sermon submitted', j(r.data));
  sermonId = r.data.id || r.data.sermon?.id;
  if (!sermonId) sermonId = (await call('/api/admin/sermons', { cookie: admin1 })).data.list.find((s) => String(s.date).startsWith(sunday))?.id;
  ok(!(await sermonsPublic()).some((s) => s.id === sermonId), 'hidden before approval');
  ok((await approve(admin2, (await pendingFor(admin2, 'sermon')).find((a) => a.resourceId === sermonId)?.id)).status === 200, 'admin2 approves');
}
ok((await sermonsPublic()).some((s) => s.id === sermonId), 'shown on Sermons after approval');

test('SRM-02', 'One sermon per Sunday');
r = await call('/api/admin/sermons', { cookie: admin1, method: 'POST', json: { title: 'Duplicate', speaker: 'X', link: 'https://www.facebook.com/watch/?v=999', date: sunday, dateIso: sunday } });
ok(r.status >= 400 && /already/i.test(r.data.error || ''), 'refused: already exists', `${r.status} ${j(r.data)}`);

test('SRM-03', 'Rating = number of views');
const v0 = (await sermonsPublic()).find((s) => s.id === sermonId)?.views ?? 0;
const viewA = `viewer-a-${stamp}`;
r = await call('/api/sermons/view', { method: 'POST', json: { sermonId, clientId: viewA } });
ok(r.status === 200 && r.data.views === v0 + 1 && r.data.rating === r.data.views, 'a view raises rating by 1', j(r.data));
r = await call('/api/sermons/view', { method: 'POST', json: { sermonId, clientId: viewA } });
ok(r.data.views === v0 + 1, 'the same device is only counted once', j(r.data));
await call('/api/sermons/view', { method: 'POST', json: { sermonId, clientId: `viewer-b-${stamp}` } });
ok((await sermonsPublic()).find((s) => s.id === sermonId)?.views === v0 + 2, 'a second device counts, shown on the Sermons page');

// ---------------------------------------------------------------- PRC
const publicProcesses = async (cookie) => (await call('/api/processes', { cookie })).data.list;
const addProcess = (title, audience) =>
  call('/api/admin/processes', { cookie: admin1, method: 'POST', json: { title, contentHtml: '<p>Step 1: unlock the door.</p>', audience } });
const attach = (id, name, type, cookie = admin1) => {
  const fd = new FormData();
  fd.append('file', file(name, type), name);
  return call(`/api/admin/processes/${id}/attachments`, { cookie, method: 'POST', form: fd });
};
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

test('PRC-01', 'Public process');
const p1 = await addProcess(`Opening the hall ${stamp}`, 'public');
ok(p1.status === 200, 'process submitted', j(p1.data));
r = await attach(p1.data.id, 'hall-opening-checklist.xlsx', XLSX);
ok(r.status === 200, 'Excel attached', j(r.data));
ok(!(await publicProcesses()).some((p) => p.id === p1.data.id), 'hidden before approval');
await approve(admin2, (await pendingFor(admin2, 'process')).find((a) => a.resourceId === p1.data.id)?.id);
const pub1 = (await publicProcesses()).find((p) => p.id === p1.data.id);
ok(!!pub1 && pub1.ownerName, 'shown to logged-out visitors, with owner', j(pub1 && { owner: pub1.ownerName }));
const dl = pub1 ? await fetch(BASE + pub1.attachments[0].storedPath) : null;
ok(dl && dl.status === 200 && (await dl.arrayBuffer()).byteLength > 1000, 'Excel downloads when logged out');

test('PRC-02', 'Stewards-only process');
const p2 = await addProcess(`Counting the offering ${stamp}`, 'steward');
await approve(admin2, (await pendingFor(admin2, 'process')).find((a) => a.resourceId === p2.data.id)?.id);
ok(!(await publicProcesses()).some((p) => p.id === p2.data.id), 'hidden when logged out');
ok((await publicProcesses(staff)).some((p) => p.id === p2.data.id), 'visible to staff');

test('PRC-03', 'Tag is required');
r = await addProcess(`No tag ${stamp}`, undefined);
ok(r.status === 400 && /tag/i.test(r.data.error), 'refused', j(r.data));

test('PRC-04', 'Wrong file type');
r = await attach(p1.data.id, 'notes.txt', 'text/plain');
ok(r.status === 400 && /excel|word/i.test(r.data.error), 'refused: only Excel or Word', j(r.data));

test('PRC-05', 'Edit waits for approval');
const v1 = (await publicProcesses()).find((p) => p.id === p1.data.id);
r = await call(`/api/admin/processes/${p1.data.id}`, { cookie: admin1, method: 'PATCH', json: { contentHtml: '<p>Step 1: unlock both doors.</p>' } });
ok(r.status === 200, 'edit submitted', j(r.data));
r = await attach(p1.data.id, 'hall-opening-checklist.xlsx', XLSX);
ok(r.status === 200, 'extra file added to the pending edit', j(r.data));
let live = (await publicProcesses()).find((p) => p.id === p1.data.id);
ok(live.contentHtml.includes('unlock the door') && live.attachments.length === v1.attachments.length, 'old text and files show until approved');
const prcEdit = (await pendingFor(admin2, 'process')).find((a) => a.resourceId === p1.data.id);
ok((await approve(admin2, prcEdit?.id)).status === 200, 'admin2 approves the edit');
live = (await publicProcesses()).find((p) => p.id === p1.data.id);
ok(live.contentHtml.includes('both doors') && live.attachments.length === v1.attachments.length + 1 && live.version === v1.version + 1, 'new text, new file and version +1', j({ v: live.version, files: live.attachments.length }));

test('PRC-06', 'Removing a live file');
r = await call(`/api/admin/processes/${p1.data.id}/attachments/${live.attachments[0].id}`, { cookie: admin1, method: 'DELETE' });
ok(r.status >= 400 && /edit/i.test(r.data.error || ''), 'told to use Edit and submit for approval', `${r.status} ${j(r.data)}`);

// ---------------------------------------------------------------- BKG
const bookingDay = '2026-12-12';
const bookingA = { fullName: 'John Perera', email: 'john@example.com', phone: '0771112222', purpose: 'Birthday party', date: bookingDay, startTime: '10:00', endTime: '12:00', hall: 'Main Hall' };
const adminBookings = async () => (await call('/api/admin/bookings', { cookie: admin1 })).data.list;
test('BKG-01', 'Public booking request');
const reqA = await call('/api/bookings/request', { method: 'POST', json: bookingA });
ok(reqA.status === 200 && /^B[A-Z2-9]{8}$/.test(reqA.data.bookingRef), 'request accepted with a reference', j(reqA.data));
ok(reqA.data.amount === 6000, 'estimate is LKR 6,000 (4 × 30 min at 1,500)', j(reqA.data));

test('BKG-02', 'Details required');
r = await call('/api/bookings/request', { method: 'POST', json: { ...bookingA, phone: '' } });
ok(r.status === 400 && /phone/i.test(r.data.error), 'asks for a phone number', j(r.data));

test('BKG-03', 'No bookings after 10 pm');
r = await call('/api/bookings/request', { method: 'POST', json: { ...bookingA, startTime: '21:00', endTime: '22:30' } });
ok(r.status === 400 && /10[:.]00 ?p\.?m|22:00/i.test(r.data.error), 'refused: bookings end by 10:00 p.m.', j(r.data));

test('BKG-04', 'Approve booking');
const reqB = await call('/api/bookings/request', { method: 'POST', json: { ...bookingA, fullName: 'Ann Silva', email: 'ann@example.com', phone: '0773334444', startTime: '11:00', endTime: '13:00', purpose: 'Choir meeting' } });
ok(reqB.status === 200, 'Booking B (overlapping) can still be requested', j(reqB.data));
const bA = (await adminBookings()).find((b) => b.bookingRef === reqA.data.bookingRef);
const bB = (await adminBookings()).find((b) => b.bookingRef === reqB.data.bookingRef);
const apA = (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bA.id);
ok(apA?.canAct === true, 'any admin can act on a public request');
ok((await approve(admin1, apA?.id)).status === 200, 'admin1 approves Booking A');
const viewA = (await call(`/api/bookings/${reqA.data.bookingRef}`)).data.booking;
ok(viewA.status === 'APPROVED_PENDING_PAYMENT', 'A is approved, awaiting payment');
ok(viewA.bankAccount?.accountNumber === '1234567890', 'booking page shows the church bank details to pay into', j(viewA.bankAccount));
ok((await call('/api/bookings/availability')).data.booked.some((x) => String(x.date).startsWith(bookingDay) && x.startTime === '10:00'), 'calendar shows 12 Dec 10:00–12:00');

test('BKG-05', 'Clash blocked');
const apB = (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bB.id);
r = await approve(admin1, apB?.id);
ok(r.status === 400 && /clash/i.test(r.data.error), 'refused: clashes with Booking A', j(r.data));
ok((await reject(admin1, apB?.id, 'Clashes with another booking')).status === 200, 'rejected with a reason');

test('BKG-06', 'Taken slot refused');
r = await call('/api/bookings/request', { method: 'POST', json: { ...bookingA, fullName: 'Late Comer', startTime: '11:30', endTime: '12:30' } });
ok(r.status === 409 && /already booked/i.test(r.data.error), '"already booked" message', j(r.data));

test('BKG-07', 'Reject booking');
const reqC = await call('/api/bookings/request', { method: 'POST', json: { fullName: 'Tom Dias', email: 'tom@example.com', phone: '0775556666', purpose: 'Wedding rehearsal', date: '2026-12-19', startTime: '14:00', endTime: '15:00', hall: 'Chapel' } });
const bC = (await adminBookings()).find((b) => b.bookingRef === reqC.data.bookingRef);
ok((await reject(admin1, (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bC.id)?.id, 'Hall closed')).status === 200, 'admin rejects with reason');
ok((await call(`/api/bookings/${reqC.data.bookingRef}`)).data.booking.status === 'REJECTED', 'booking page shows Rejected');

test('BKG-08', 'Payment slip checks');
const pay = (name, type) => {
  const fd = new FormData();
  // The "too big" slip is made in memory (5 MB PDF header + padding) to keep the repo small.
  const blob = name === 'too-big-5mb.pdf'
    ? new Blob([Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024, 32)])], { type })
    : file(name, type);
  fd.append('file', blob, name);
  fd.append('paymentRef', 'TXN-2026-001');
  return call(`/api/bookings/${reqA.data.bookingRef}/payment`, { method: 'POST', form: fd });
};
r = await pay('not-really-an-image.png', 'image/png');
ok(r.status === 400, 'fake image refused', j(r.data));
r = await pay('too-big-5mb.pdf', 'application/pdf');
ok(r.status === 400 || r.status === 413, 'file over 4 MB refused', `${r.status} ${j(r.data)}`);
r = await pay('payment-slip.png', 'image/png');
ok(r.status === 200, 'real slip accepted', j(r.data));
const pubA = (await call(`/api/bookings/${reqA.data.bookingRef}`)).data.booking;
ok(pubA.slipReceived === true && pubA.slipUrl === undefined, 'shows "received" with no file link');

test('BKG-09', 'Slip is private');
const slipUrl = (await adminBookings()).find((b) => b.id === bA.id).slipUrl;
ok((await call(slipUrl, { cookie: admin1 })).status === 200, 'admin sees the slip');
ok((await call(slipUrl)).status === 404, 'logged out gets Not found');

test('BKG-10', 'Confirm payment');
const payAp = (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bA.id && a.action === 'confirm_payment');
ok(payAp && payAp.bookingDetails?.slipUrl, 'payment check is in the Approvals queue with the slip', j(payAp?.bookingDetails));
ok((await approve(admin1, payAp?.id)).status === 200, 'payment confirmed');
ok((await call(`/api/bookings/${reqA.data.bookingRef}`)).data.booking.status === 'BOOKED_PAID', 'status is Paid');

test('BKG-11', 'Paid cannot be cancelled');
r = await call(`/api/admin/bookings/${bA.id}`, { cookie: admin1, method: 'DELETE' });
ok(r.status === 400 && /paid/i.test(r.data.error), 'refused', j(r.data));

test('BKG-12', 'Auto-cancel unpaid');
const colombo = new Date(Date.now() + 5.5 * 3600000);
const startMin = colombo.getUTCHours() * 60 + colombo.getUTCMinutes() + 35;
if (startMin + 30 <= 22 * 60 && startMin >= 8 * 60) {
  const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const reqD = await call('/api/bookings/request', { method: 'POST', json: { fullName: 'Late Payer', email: 'late@example.com', phone: '0779998888', purpose: 'Meeting', date: ymd(colombo), startTime: hh(startMin), endTime: hh(startMin + 30), hall: 'Chapel' } });
  const bD = (await adminBookings()).find((b) => b.bookingRef === reqD.data.bookingRef);
  await approve(admin1, (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bD?.id)?.id);
  r = await call('/api/cron/booking-auto-cancel');
  ok(r.status === 200, 'scheduled job runs', j(r.data));
  ok((await call(`/api/bookings/${reqD.data.bookingRef}`)).data.booking.status === 'AUTO_CANCELLED', 'unpaid booking inside the 1-hour window is cancelled');
} else {
  ok(true, 'skipped: outside 8 a.m.–9 p.m. Colombo time');
}

// ---------------------------------------------------------------- MED
const medical = async () => (await call('/api/admin/medical', { cookie: admin1 })).data;
test('MED-01', 'Add medical item');
const item = await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: `Wheelchair ${stamp}`, quantityTotal: 1 } });
ok(item.status === 200, 'item added', j(item.data));
ok((await medical()).items.find((i) => i.id === item.data.id)?.quantityAvailable === 1, '1 available');

test('MED-02', 'Staff requests a loan');
const loan = await call('/api/admin/medical/loans', { cookie: staff2, method: 'POST', json: { itemId: item.data.id, givenTo: 'Mr. Fernando', dueDate: '2026-12-31' } });
ok(loan.status === 200, 'request listed', j(loan.data));
ok((await medical()).items.find((i) => i.id === item.data.id)?.quantityAvailable === 0, '0 available');

test('MED-03', 'Nothing left to lend');
r = await call('/api/admin/medical/loans', { cookie: staff2, method: 'POST', json: { itemId: item.data.id, givenTo: 'Someone else' } });
ok(r.status === 400, 'refused: none available', j(r.data));

test('MED-04', 'Only admins approve loans');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/approve`, { cookie: staff2, method: 'POST' })).status === 403, 'staff refused');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/approve`, { cookie: admin3, method: 'POST' })).status === 200, 'admin3 approves');

test('MED-05', 'Issue and return');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/issue`, { cookie: staff2, method: 'POST' })).status === 200, 'issued');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/return`, { cookie: staff2, method: 'POST' })).status === 200, 'returned');
const md = await medical();
const ln = md.loans.find((l) => l.id === loan.data.id);
ok(ln?.issuedAt && ln?.returnedAt && ln?.returned === true, 'dates recorded', j(ln));
ok(md.items.find((i) => i.id === item.data.id)?.quantityAvailable === 1, '1 available again');

// ---------------------------------------------------------------- AUD
test('AUD-01', 'Everything is logged');
const audit = (await call('/api/admin/audit', { cookie: admin1 })).data.list;
for (const act of ['request_update_church_bank_account', 'approve_church_bank_account_update', 'request_create_asset', 'approve_individual_create', 'approve_notice_publish', 'reject_notice_publish', 'approve_process_publish', 'approve_hall_settings_update', 'approve_booking_confirm_payment', 'approve_medical_loan']) {
  ok(audit.some((l) => l.action === act), `logs ${act}`);
}
ok(audit.every((l) => l.createdAt && (l.actor?.name || l.actor?.email)), 'every entry has who and when');

// ---------------------------------------------------------------- PRF
test('PRF-01', 'Pages load in under 2 seconds');
for (const path of ['/', '/notices', '/sermons', '/processes', '/book-hall', '/api/notices', '/api/sermons', '/api/processes', '/api/bookings/availability']) {
  await fetch(BASE + path);
  const t = performance.now();
  const res = await fetch(BASE + path);
  await res.arrayBuffer();
  const ms = Math.round(performance.now() - t);
  ok(res.status === 200 && ms < 2000, `${path} second load ${ms} ms`, `${res.status} ${ms} ms`);
}

// ---------------------------------------------------------------- SEC-04 last: locks staff3 for 15 minutes
test('SEC-04', 'Lockout after 5 wrong passwords');
for (let i = 0; i < 5; i++) await login('staff3@example.com', 'wrong-password');
const locked = await login('staff3@example.com', 'Staff@123');
ok(locked.status === 429 && /15 minutes/i.test(locked.data?.message || locked.data?.error || ''), 'locked for 15 minutes', j(locked.data));

// ---------------------------------------------------------------- report
const order = ['SEC', 'FIN', 'AST', 'PPL', 'NTC', 'SRM', 'PRC', 'BKG', 'MED', 'AUD', 'PRF'];
results.sort((a, b) => order.indexOf(a.id.slice(0, 3)) - order.indexOf(b.id.slice(0, 3)) || a.id.localeCompare(b.id));
let failed = 0;
for (const t of results) {
  const bad = t.checks.filter((c) => !c.pass);
  if (bad.length) failed++;
  console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${t.id}  ${t.title}  (${t.checks.length - bad.length}/${t.checks.length})`);
  for (const c of bad) console.log(`        ✗ ${c.label}${c.extra ? `  -> ${c.extra}` : ''}`);
}
console.log(`\n${results.length - failed} of ${results.length} test cases passed.`);
if (process.env.RESULTS_JSON) {
  (await import('fs')).writeFileSync(process.env.RESULTS_JSON, JSON.stringify(results, null, 2));
}
process.exit(failed ? 1 : 0);

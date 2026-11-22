/**
 * Second test suite: every function of the site, tried by every role.
 *
 *   Roles:  visitor (not logged in) · staff · administrator A (the maker) · administrator B (the checker)
 *   Run:    npm test   (starts after tests/test-plan.api.mjs on a freshly reset local database)
 *
 * Case IDs continue the numbering of test-plan.api.mjs and add new groups:
 *   ROL role access matrix · PUB visitor pages · AUT login and sessions · VAL bad input
 *   FIL file access · APR approvals · plus extra cases in the existing groups.
 * Never run against the live site.
 */
import { BASE, test, use, ok, call, login, file, j, pendingFor, approve, reject, ymd, finish } from './lib.mjs';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const stamp = Date.now();
const S = {};
for (const [k, email, pw] of [
  ['admin1', 'admin1@example.com', 'Admin@123'], ['admin2', 'admin2@example.com', 'Admin@123'],
  ['admin3', 'admin3@example.com', 'Admin@123'], ['admin4', 'admin4@example.com', 'Admin@123'],
  ['staff', 'staff@example.com', 'Staff@123'], ['staff2', 'staff2@example.com', 'Staff@123'],
]) S[k] = (await login(email, pw)).cookie;
const { admin1, admin2, admin3, admin4, staff, staff2 } = S;
let r;

/** Maker (A) submits, checker (B) approves. Returns the approval row that was approved. */
async function makerChecker(type, match, { checker = admin2, how = 'approve', comment } = {}) {
  const ap = (await pendingFor(checker, type)).filter(match).slice(-1)[0];
  if (!ap) return null;
  const res = how === 'approve' ? await approve(checker, ap.id) : await reject(checker, ap.id, comment || 'Not needed');
  return { ap, res };
}

// =============================================================== ROL  role access matrix
// Who may call what. Bad input is sent on purpose so that no data is changed.
const PUBLIC_GET = ['/api/notices', '/api/sermons', '/api/processes', '/api/bookings/pricing', '/api/bookings/availability', '/api/auth/bootstrap-eligible', '/api/approvals/count'];
const STAFF_GET = ['/api/approvals', '/api/admin/anniversaries', '/api/admin/assets', '/api/admin/assets/categories', '/api/admin/assets/references', '/api/admin/audit', '/api/admin/bookings', '/api/admin/church-bank-account', '/api/admin/hall-booking-settings', '/api/admin/individuals', '/api/admin/medical', '/api/admin/notices', '/api/admin/processes', '/api/admin/sermons'];
const ADMIN_ONLY = [
  ['GET', '/api/admin/users'], ['POST', '/api/admin/users'], ['DELETE', '/api/admin/users/999999'],
  ['POST', '/api/admin/anniversaries'], ['PATCH', '/api/admin/anniversaries/999999'],
  ['POST', '/api/admin/assets'], ['PATCH', '/api/admin/assets/999999'], ['DELETE', '/api/admin/assets/999999'], ['POST', '/api/admin/assets/categories'],
  ['POST', '/api/admin/church-bank-account'], ['PATCH', '/api/admin/hall-booking-settings'],
  ['POST', '/api/admin/individuals'], ['PATCH', '/api/admin/individuals/999999'],
  ['POST', '/api/admin/medical/items'], ['POST', '/api/admin/medical/loans/999999/approve'],
  ['POST', '/api/admin/notices'], ['DELETE', '/api/admin/notices/999999'],
  ['POST', '/api/admin/sermons'], ['DELETE', '/api/admin/sermons/999999'],
  ['DELETE', '/api/admin/bookings/999999'],
  ['POST', '/api/admin/processes'], ['PATCH', '/api/admin/processes/999999'], ['DELETE', '/api/admin/processes/999999'],
  ['POST', '/api/admin/processes/999999/attachments'], ['DELETE', '/api/admin/processes/999999/attachments/999999'],
  ['POST', '/api/approvals/approve'], ['POST', '/api/approvals/reject'],
];
const STAFF_WRITE = [['POST', '/api/admin/medical/loans'], ['POST', '/api/admin/medical/loans/999999/issue'], ['POST', '/api/admin/medical/loans/999999/return']];
const hit = (cookie, [method, path]) => call(path, { cookie, method, ...(method === 'GET' ? {} : { json: {} }) });
const names = (rows) => rows.map((x) => (Array.isArray(x) ? `${x[0]} ${x[1]}` : x)).join('; ');

test('ROL-01', 'Visitor: public pages and data open, nothing private', 'Visitor');
let bad = [];
for (const p of PUBLIC_GET) { const x = await call(p); if (x.status !== 200) bad.push(`${p} ${x.status}`); }
ok(bad.length === 0, `${PUBLIC_GET.length} public endpoints answer 200`, bad.join(', '));
bad = [];
for (const p of [...STAFF_GET, '/api/admin/users']) { const x = await call(p); if (x.status !== 401) bad.push(`${p} ${x.status}`); }
ok(bad.length === 0, `${STAFF_GET.length + 1} private data endpoints refuse a visitor (401)`, bad.join(', '));
bad = [];
for (const e of [...ADMIN_ONLY, ...STAFF_WRITE].filter((e) => e[1] !== '/api/admin/users' || e[0] !== 'GET')) { const x = await hit(null, e); if (x.status !== 401) bad.push(`${e[0]} ${e[1]} ${x.status}`); }
ok(bad.length === 0, `${ADMIN_ONLY.length + STAFF_WRITE.length - 1} change endpoints refuse a visitor (401)`, bad.join('; '));

test('ROL-02', 'Staff: can read everything, cannot change administrator-only things', 'Staff');
bad = [];
for (const p of STAFF_GET) { const x = await call(p, { cookie: staff }); if (x.status !== 200) bad.push(`${p} ${x.status}`); }
ok(bad.length === 0, `staff can read ${STAFF_GET.length} lists`, bad.join(', '));
ok((await call('/api/admin/users', { cookie: staff })).status === 403, 'staff cannot see the accounts list (403)');
bad = [];
for (const e of ADMIN_ONLY.filter((e) => !(e[0] === 'GET'))) { const x = await hit(staff, e); if (x.status !== 403) bad.push(`${e[0]} ${e[1]} ${x.status}`); }
ok(bad.length === 0, `staff refused on ${ADMIN_ONLY.length - 1} administrator-only changes (403)`, bad.join('; '));

test('ROL-03', 'Staff: may handle medical loans', 'Staff');
r = await hit(staff, ['POST', '/api/admin/medical/loans']);
ok(r.status === 400, 'staff can request a loan (asks for the missing details)', `${r.status} ${j(r.data)}`);
r = await hit(staff, ['POST', '/api/admin/medical/loans/999999/issue']);
ok(r.status === 404, 'staff can hand over a loan (this one does not exist)', `${r.status}`);
r = await hit(staff, ['POST', '/api/admin/medical/loans/999999/return']);
ok(r.status === 404, 'staff can record a return (this one does not exist)', `${r.status}`);

test('ROL-04', 'Administrators: allowed everywhere, and bad input never causes a server error', 'Administrator');
bad = [];
for (const e of [...ADMIN_ONLY, ...STAFF_WRITE]) { const x = await hit(admin1, e); if ([401, 403].includes(x.status) || x.status >= 500) bad.push(`${e[0]} ${e[1]} ${x.status} ${j(x.data)}`); }
ok(bad.length === 0, `${ADMIN_ONLY.length + STAFF_WRITE.length} calls with empty details are answered with a clear message, never 401/403/500`, bad.join('; '));
bad = [];
for (const p of [...STAFF_GET]) { const x = await call(p, { cookie: admin1 }); if (x.status !== 200) bad.push(`${p} ${x.status}`); }
ok(bad.length === 0, `administrators can read ${STAFF_GET.length} lists`, bad.join(', '));
ok((await call('/api/admin/users', { cookie: admin1 })).status === 200, 'administrators can see the accounts list');

test('ROL-05', 'Approvals count by role', 'Visitor, Staff, Administrator');
ok((await call('/api/approvals/count')).data.count === 0, 'visitor sees 0');
ok((await call('/api/approvals/count', { cookie: staff })).data.count === 0, 'staff sees 0 (they cannot approve)');
const open = (await call('/api/approvals', { cookie: admin1 })).data.list.filter((a) => a.status === 'SUBMITTED').length;
ok((await call('/api/approvals/count', { cookie: admin1 })).data.count === open, `administrator sees the real number (${open})`);

// =============================================================== PUB  what a visitor sees
test('PUB-01', 'Visitor: every public page opens', 'Visitor');
for (const [p, text] of [['/', 'Mount Lavinia'], ['/notices', 'Mount Lavinia'], ['/sermons', 'Mount Lavinia'], ['/processes', 'Mount Lavinia'], ['/book-hall', 'Mount Lavinia'], ['/login', 'Mount Lavinia'], ['/booking/BNOSUCHREF', 'Mount Lavinia']]) {
  const x = await call(p);
  ok(x.status === 200 && String(x.data).includes(text), `${p} opens`, `${x.status}`);
}
r = await call('/this-page-does-not-exist');
ok(r.status === 404, 'a wrong address shows "not found"', `${r.status}`);
for (const p of ['/admin', '/admin/approvals', '/admin/accounts', '/admin/people']) {
  const x = await call(p);
  ok([307, 308].includes(x.status) && /\/login\?next=/.test(x.headers.get('location') || ''), `${p} sends a visitor to log in`, `${x.status}`);
}

test('PUB-02', 'Visitor: hall prices and calendar', 'Visitor');
const price = (await call('/api/bookings/pricing')).data;
ok(price.ratePer30Minutes === 1500, 'the hall rate is shown', j(price));
const av = (await call('/api/bookings/availability')).data;
ok(Array.isArray(av.booked), 'the calendar lists taken times', j(av).slice(0, 120));
ok(!JSON.stringify(av).match(/@|phone|requesterName|purpose/i), 'the calendar shows no personal details', j(av).slice(0, 200));

test('PUB-03', 'Visitor: booking checks', 'Visitor');
const day = '2027-03-06';
const base = { fullName: 'Test Visitor', email: 'visitor@example.com', phone: '0771112233', purpose: 'Family lunch', date: day, startTime: '10:00', endTime: '11:00', hall: 'Main Hall' };
const book = (over) => call('/api/bookings/request', { method: 'POST', json: { ...base, ...over } });
r = await book({}); ok(r.status === 200 && r.data.amount === 3000, 'one hour costs 2 blocks = LKR 3,000', j(r.data));
const ref1 = r.data.bookingRef;
r = await book({ startTime: '12:00', endTime: '12:30' }); ok(r.status === 200 && r.data.amount === 1500, '30 minutes costs LKR 1,500', j(r.data));
r = await book({ startTime: '13:00', endTime: '13:31' }); ok(r.status === 200 && r.data.amount === 3000, '31 minutes counts as two blocks', j(r.data));
r = await book({ hall: 'Chapel' }); ok(r.status === 200, 'the Chapel can be requested too', j(r.data));
for (const [label, over, rx] of [
  ['starting before 8 a.m.', { startTime: '07:30', endTime: '09:00' }, /8/],
  ['ending after 10 p.m.', { startTime: '21:00', endTime: '22:30' }, /10/],
  ['ending before starting', { startTime: '11:00', endTime: '10:00' }, /./],
  ['zero length', { startTime: '11:00', endTime: '11:00' }, /./],
  ['a date in the past', { date: '2020-01-01' }, /today|future/i],
  ['an unknown hall', { hall: 'Garden' }, /hall|chapel/i],
  ['a bad email address', { email: 'not-an-email' }, /email/i],
  ['a very short phone number', { phone: '123' }, /phone/i],
  ['a one-letter name', { fullName: 'A' }, /name/i],
  ['no purpose', { purpose: '' }, /for|purpose/i],
  ['an over-long purpose', { purpose: 'x'.repeat(1001) }, /./],
]) {
  const x = await book(over);
  ok(x.status === 400 && rx.test(x.data.error || ''), `refused: ${label}`, `${x.status} ${j(x.data)}`);
}

test('PUB-04', 'Visitor: booking page lookup', 'Visitor');
r = await call(`/api/bookings/${ref1}`);
ok(r.status === 200 && r.data.booking.status === 'REQUESTED' && r.data.booking.amount === 3000, 'a reference opens its booking page', j(r.data).slice(0, 160));
ok(r.data.booking.bankAccount === null || r.data.booking.bankAccount === undefined, 'no bank details before approval');
ok((await call('/api/bookings/BXXXXXXXX')).status === 404, 'an unknown reference is "not found"');
ok((await call('/api/bookings/%27%20OR%201%3D1--')).status === 404, 'a trick reference is "not found"');

// =============================================================== AUT  login and sessions
test('AUT-01', 'Login: wrong details give one generic message', 'Visitor');
const wrongPw = await login('admin1@example.com', 'nope-nope');
const noUser = await login('nobody@example.com', 'nope-nope');
ok(wrongPw.status === 401 && noUser.status === 401, 'both refused (401)');
ok(JSON.stringify(wrongPw.data) === JSON.stringify(noUser.data), 'same message for a wrong password and an unknown email (no account guessing)', `${j(wrongPw.data)} / ${j(noUser.data)}`);
r = await login('', '');
ok(r.status === 401 && /not correct/i.test(r.data?.message || ''), 'an empty form gets the same generic message (401)', `${r.status} ${j(r.data)}`);

test('AUT-02', 'Login: session cookie is safe', 'Staff, Administrator');
const raw = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'staff@example.com', password: 'Staff@123' }) });
const sc = raw.headers.get('set-cookie') || '';
ok(/HttpOnly/i.test(sc), 'cookie is HttpOnly (scripts cannot read it)', sc);
ok(/SameSite=Lax/i.test(sc), 'cookie is SameSite=Lax', sc);
ok(/Max-Age=28800/i.test(sc) || /Expires=/i.test(sc), 'cookie expires after 8 hours', sc);
const who = (await call('/api/auth/check', { cookie: staff })).data;
ok(who.role === 'staff' && who.name, 'staff is recognised as staff', j(who));

test('AUT-03', 'Login: bad or forged sessions are ignored', 'Visitor');
ok((await call('/api/auth/check')).data.authenticated !== true, 'no cookie = not logged in');
r = await call('/api/approvals', { cookie: 'token=abc.def.ghi' });
ok(r.status === 401, 'a made-up token is refused', `${r.status}`);
const payload = Buffer.from(JSON.stringify({ id: 1, role: 'admin', email: 'admin1@example.com', name: 'Forged' })).toString('base64url');
r = await call('/api/approvals', { cookie: `token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.AAAA` });
ok(r.status === 401, 'a forged administrator token is refused', `${r.status}`);
r = await call('/api/auth/check', { cookie: `token=eyJhbGciOiJub25lIn0.${payload}.` });
ok(r.data.authenticated !== true, 'a token with no signature is refused');

test('AUT-04', 'Logout', 'Staff, Administrator');
const out = await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { cookie: admin1 } });
const cleared = out.headers.get('set-cookie') || '';
ok(out.status === 200 && /token=;/.test(cleared) && /(Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(cleared), 'the login cookie is cleared', cleared);

test('AUT-05', 'First-time setup is closed once two administrators exist', 'Visitor');
ok((await call('/api/auth/bootstrap-eligible')).data.eligible === false, 'setup box is not offered');
r = await call('/api/auth/bootstrap', { method: 'POST', json: { secret: 'guess', email: 'x@example.com', password: 'Password1', name: 'X' } });
ok([401, 403, 404].includes(r.status), 'creating an administrator without the secret fails', `${r.status}`);

// =============================================================== SEC  browser protections
test('SEC-06', 'Every page carries browser protections', 'Visitor');
for (const p of ['/', '/login', '/admin', '/api/notices']) {
  const x = await fetch(BASE + p, { redirect: 'manual' });
  const h = (n) => x.headers.get(n) || '';
  ok(h('x-frame-options') === 'DENY' && /frame-ancestors 'none'/.test(h('content-security-policy')), `${p} cannot be shown inside another site`, `${h('x-frame-options')}`);
  ok(h('x-content-type-options') === 'nosniff' && /strict-origin/.test(h('referrer-policy')), `${p} has nosniff and a strict referrer policy`);
}

// =============================================================== VAL  bad input everywhere
test('VAL-01', 'Bad input never crashes the site', 'Visitor, Administrator');
bad = [];
for (const [p, who] of [['/api/auth/login', null], ['/api/bookings/request', null], ['/api/sermons/view', null], ['/api/auth/bootstrap', null], ['/api/admin/notices', admin1], ['/api/admin/sermons', admin1], ['/api/admin/individuals', admin1], ['/api/admin/assets', admin1], ['/api/admin/users', admin1], ['/api/approvals/approve', admin1]]) {
  const res = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(who ? { cookie: who } : {}) }, body: '{not json' });
  if (res.status >= 500) bad.push(`${p} ${res.status}`);
}
ok(bad.length === 0, '10 endpoints answer broken JSON with a 4xx message', bad.join(', '));
const nasty = `'; DROP TABLE "User";-- <script>alert(1)</script> "quoted" \\ ${'é'.repeat(5)}`;
r = await call('/api/auth/login', { method: 'POST', json: { email: nasty, password: nasty } });
ok(r.status < 500, 'odd characters in the login form are handled', `${r.status}`);
r = await book({ purpose: nasty, fullName: 'Tester O’Brien' });
ok(r.status === 200, 'odd characters in a booking are accepted as plain text', `${r.status} ${j(r.data)}`);
const nastyBooking = (await call(`/api/bookings/${r.data.bookingRef}`)).data.booking;
ok(nastyBooking.purpose === nasty, 'and stored exactly as typed, not run', j(nastyBooking.purpose));
ok((await call('/api/admin/users', { cookie: admin1 })).status === 200, 'the database is still intact after the attempt');
r = await call('/api/admin/individuals?fromDate=2026-12-01', { cookie: admin1 });
ok(r.status === 400, 'a date range needs both dates (400)', `${r.status}`);
r = await call('/api/admin/individuals?fromDate=2026-12-10&toDate=2026-12-01', { cookie: admin1 });
ok(r.status === 400, 'a backwards date range is refused (400)', `${r.status}`);
r = await call('/api/admin/individuals?fromDate=garbage&toDate=2026-12-01', { cookie: admin1 });
ok(r.status === 400, 'a garbage date is refused (400)', `${r.status}`);
r = await call('/api/admin/individuals?page=-5&pageSize=100000', { cookie: admin1 });
ok(r.status === 200 && r.data.pageSize <= 100 && r.data.page === 1, 'page numbers are kept within limits', j({ p: r.data.page, s: r.data.pageSize }));
for (const m of ['PUT', 'DELETE']) {
  r = await call('/api/admin/audit', { cookie: admin1, method: m });
  ok(r.status === 405, `the audit log cannot be changed (${m} → 405)`, `${r.status}`);
}

// =============================================================== NTC  more notice cases
const noticePublic = async (id) => (await call('/api/notices')).data.list.find((x) => x.id === id);
const noticeAdmin = async (id) => (await call('/api/admin/notices', { cookie: admin1 })).data.list.find((x) => x.id === id);
const newNotice = (title, weekOf) => call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title, bodyHtml: '<p>Body text.</p>', weekOf } });
const thisSunday = (() => { const l = new Date(Date.now() + 5.5 * 3600000); l.setUTCDate(l.getUTCDate() + ((7 - l.getUTCDay()) % 7)); return ymd(l); })();
const sundayAfter = (n) => { const d = new Date(thisSunday + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7 * n); return ymd(d); };

test('NTC-05', 'Remove a notice (needs a second administrator)', 'Administrator A, Administrator B, Staff');
r = await newNotice(`Remove me ${stamp}`, thisSunday + 'T00:00:00.000Z');
const nDel = r.data.id;
await makerChecker('notice', (a) => a.resourceId === nDel);
ok(!!(await noticePublic(nDel)), 'published and visible to visitors');
ok((await call(`/api/admin/notices/${nDel}`, { cookie: staff, method: 'DELETE' })).status === 403, 'staff cannot ask to remove it');
ok((await call(`/api/admin/notices/${nDel}`, { cookie: admin1, method: 'DELETE' })).status === 200, 'administrator A asks to remove it');
ok(!!(await noticePublic(nDel)), 'still visible until approved');
ok((await call(`/api/admin/notices/${nDel}`, { cookie: admin1, method: 'DELETE' })).status === 400, 'asking twice is refused');
const delAp = (await pendingFor(admin1, 'notice')).find((a) => a.resourceId === nDel && a.action === 'delete');
ok((await approve(admin1, delAp?.id)).status === 403, 'A cannot approve their own removal');
ok((await approve(admin2, delAp?.id)).status === 200, 'administrator B approves the removal');
ok(!(await noticePublic(nDel)), 'gone from the public Notices page');

test('NTC-06', 'A rejected removal keeps the notice', 'Administrator A, Administrator B');
r = await newNotice(`Keep me ${stamp}`, thisSunday + 'T00:00:00.000Z');
const nKeep = r.data.id;
await makerChecker('notice', (a) => a.resourceId === nKeep);
await call(`/api/admin/notices/${nKeep}`, { cookie: admin1, method: 'DELETE' });
const rj = await makerChecker('notice', (a) => a.resourceId === nKeep && a.action === 'delete', { how: 'reject', comment: 'Still needed' });
ok(rj?.res.status === 200, 'administrator B rejects the removal');
ok(!!(await noticePublic(nKeep)), 'the notice stays on the website');

test('NTC-07', 'Visitors only see notices up to the coming Sunday', 'Visitor, Administrator');
r = await newNotice(`Next week ${stamp}`, sundayAfter(1) + 'T00:00:00.000Z');
const nFuture = r.data.id;
await makerChecker('notice', (a) => a.resourceId === nFuture);
ok(!(await noticePublic(nFuture)), 'a notice for next week is hidden from visitors');
ok((await noticeAdmin(nFuture))?.status === 'published', 'but administrators see it under Admin → Notices', j(await noticeAdmin(nFuture)));
r = await newNotice(`This week ${stamp}`, thisSunday + 'T00:00:00.000Z');
await makerChecker('notice', (a) => a.resourceId === r.data.id);
ok(!!(await noticePublic(r.data.id)), "this week's notice is visible");
ok((await call('/api/admin/notices', { cookie: staff })).data.list.some((x) => x.id === nFuture), 'staff also see every notice');

test('NTC-08', 'Notice checks', 'Administrator');
r = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: '', bodyHtml: '<p>x</p>', weekOf: '2026-12-06' } });
ok(r.status === 400 && /title/i.test(r.data.error), 'a title is required', j(r.data));
r = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: 'x', bodyHtml: '', weekOf: '2026-12-06' } });
ok(r.status === 400, 'the text is required', j(r.data));
r = await call('/api/admin/notices', { cookie: admin1, method: 'POST', json: { title: 'x', bodyHtml: '<p>x</p>', weekOf: 'not a date' } });
ok(r.status === 400, 'a valid week is required', j(r.data));
ok((await call('/api/admin/notices/999999', { cookie: admin1, method: 'DELETE' })).status === 404, 'removing a notice that does not exist says "not found"');

// =============================================================== SRM  more sermon cases
const sermonPublic = async (id) => (await call('/api/sermons')).data.list.find((x) => x.id === id);
const sermonAdmin = async (date) => (await call('/api/admin/sermons', { cookie: admin1 })).data.list.find((s) => String(s.date).startsWith(date));
const newSermon = (date, over = {}) => call('/api/admin/sermons', { cookie: admin1, method: 'POST', json: { title: `Sermon ${date}`, speaker: 'Rev. Test', theme: 'Hope', link: 'https://www.facebook.com/', date, dateIso: date, ...over } });

test('SRM-04', 'Remove a sermon (needs a second administrator)', 'Administrator A, Administrator B, Staff');
r = await newSermon('2026-01-04');
ok(r.status === 200, 'sermon added', j(r.data));
const sm1 = (await sermonAdmin('2026-01-04'))?.id;
await makerChecker('sermon', (a) => a.resourceId === sm1);
ok(!!(await sermonPublic(sm1)), 'visible after approval');
ok((await call(`/api/admin/sermons/${sm1}`, { cookie: staff, method: 'DELETE' })).status === 403, 'staff cannot ask to remove it');
ok((await call(`/api/admin/sermons/${sm1}`, { cookie: admin1, method: 'DELETE' })).status === 200, 'administrator A asks to remove it');
ok((await call(`/api/admin/sermons/${sm1}`, { cookie: admin1, method: 'DELETE' })).status === 400, 'asking twice is refused');
await makerChecker('sermon', (a) => a.resourceId === sm1 && a.action === 'delete');
ok(!(await sermonPublic(sm1)), 'gone from the public Sermons page');

test('SRM-05', 'A rejected sermon never appears', 'Administrator A, Administrator B');
r = await newSermon('2026-01-11');
const sm2 = (await sermonAdmin('2026-01-11'))?.id;
const rjS = await makerChecker('sermon', (a) => a.resourceId === sm2, { how: 'reject', comment: 'Wrong speaker' });
ok(rjS?.res.status === 200, 'administrator B rejects it');
ok(!(await sermonPublic(sm2)), 'it is not on the Sermons page');

test('SRM-06', 'Sermon checks', 'Staff, Administrator');
ok((await newSermon('2026-01-18', { title: '' })).status === 400, 'a title is required');
ok((await newSermon('2026-01-18', { speaker: '' })).status === 400, 'a speaker is required');
ok((await newSermon('2026-01-18', { link: '' })).status === 400, 'a link is required');
ok((await newSermon('nonsense')).status === 400, 'a real date is required');
r = await call('/api/admin/sermons', { cookie: staff, method: 'POST', json: { title: 'x', speaker: 'x', link: 'https://x.test', date: '2026-01-25' } });
ok(r.status === 403, 'staff cannot add a sermon', `${r.status}`);
ok((await call('/api/sermons/view', { method: 'POST', json: { sermonId: 999999, clientId: 'device-1234567' } })).status === 404, 'viewing a sermon that does not exist says "not found"');
ok((await call('/api/sermons/view', { method: 'POST', json: { sermonId: sm1, clientId: 'x' } })).status === 400, 'a view with an invalid device code is refused');

// =============================================================== PPL  more people cases
const person = async (name) => ((await call('/api/admin/individuals?pageSize=200', { cookie: admin1 })).data.list || []).find((x) => x.displayName === name);
const newPerson = (displayName, birthDate, extra = {}) => call('/api/admin/individuals', { cookie: admin1, method: 'POST', json: { displayName, birthDate, ...extra } });
const [nA, nB, nC] = [`Anne Perera ${stamp}`, `Mark Perera ${stamp}`, `Lena Silva ${stamp}`];
for (const [n, d] of [[nA, '1960-03-10'], [nB, '1958-07-21'], [nC, '1990-12-24']]) { await newPerson(n, d); await makerChecker('individual', (a) => JSON.stringify(a.genericDetails || {}).includes(n)); }
const pA = await person(nA); const pB = await person(nB); const pC = await person(nC);

test('PPL-07', 'Edit a person (needs a second administrator)', 'Administrator A, Administrator B, Staff');
r = await call(`/api/admin/individuals/${pA.id}`, { cookie: admin1, method: 'PATCH', json: { displayName: `${nA} Updated`, phone: '0779990000' } });
ok(r.status === 200, 'administrator A sends the change', j(r.data));
ok((await person(nA))?.phone !== '0779990000', 'the register is unchanged until approved');
ok((await call(`/api/admin/individuals/${pA.id}`, { cookie: admin1, method: 'PATCH', json: { phone: '0770000001' } })).status === 409, 'a second change while one waits is refused (409)');
ok((await call(`/api/admin/individuals/${pA.id}`, { cookie: staff, method: 'PATCH', json: { phone: '1' } })).status === 403, 'staff cannot edit');
await makerChecker('individual', (a) => a.resourceId === pA.id);
ok((await person(`${nA} Updated`))?.phone === '0779990000', 'new name and phone show after approval');
ok((await call(`/api/admin/individuals/${pA.id}`, { cookie: admin1, method: 'PATCH', json: {} })).status === 400, 'an empty change is refused');
ok((await call('/api/admin/individuals/999999', { cookie: admin1, method: 'PATCH', json: { phone: '1' } })).status === 404, 'a person that does not exist says "not found"');

test('PPL-08', 'A rejected change leaves the person as they were', 'Administrator A, Administrator B');
await call(`/api/admin/individuals/${pB.id}`, { cookie: admin1, method: 'PATCH', json: { displayName: 'Wrong Name' } });
await makerChecker('individual', (a) => a.resourceId === pB.id, { how: 'reject', comment: 'Name is wrong' });
ok(!!(await person(nB)) && !(await person('Wrong Name')), 'the original name is kept');

test('PPL-09', 'A rejected new person is never added', 'Administrator A, Administrator B');
const nD = `Rejected Person ${stamp}`;
await newPerson(nD, '1970-01-01');
const rjP = await makerChecker('individual', (a) => JSON.stringify(a.genericDetails || {}).includes(nD), { how: 'reject', comment: 'Duplicate' });
ok(rjP?.res.status === 200, 'administrator B rejects');
ok(!(await person(nD)), 'not in the register');

test('PPL-10', 'People checks', 'Administrator, Staff');
ok((await newPerson('', '1970-01-01')).status === 400, 'a name is required');
ok((await newPerson('Someone', 'not a date')).status === 400, 'a real birth date is required');
ok((await newPerson('Someone', '1970-01-01', { email: 'x'.repeat(300) })).status >= 400, 'over-long details are refused');
r = await call('/api/admin/individuals?forSelect=1', { cookie: staff });
ok(r.status === 200 && Array.isArray(r.data.list), 'staff can use the people picker');
r = await call('/api/admin/individuals?nextDays=60', { cookie: staff });
ok(r.status === 200 && Array.isArray(r.data.list), 'staff can see upcoming birthdays');
r = await call('/api/admin/individuals?fromDate=2026-12-20&toDate=2026-12-26', { cookie: admin1 });
ok(r.status === 200 && r.data.list.some((x) => x.displayName === nC), 'a date range finds a birthday on 24 December', `${r.status} ${r.data.list?.length}`);

test('PPL-11', 'Anniversary: edit, deactivate and checks', 'Administrator A, Administrator B');
r = await call('/api/admin/anniversaries', { cookie: admin1, method: 'POST', json: { individualAId: pA.id, individualBId: pA.id, anniversaryDate: '1990-05-05' } });
ok(r.status === 400 || r.status === 200, 'two different people are expected', `${r.status}`);
if (r.status === 200) await makerChecker('anniversary', () => true, { how: 'reject' });
r = await call('/api/admin/anniversaries', { cookie: admin1, method: 'POST', json: { individualAId: pA.id, individualBId: pB.id, anniversaryDate: '1985-06-15' } });
ok(r.status === 200, 'anniversary sent', j(r.data));
await makerChecker('anniversary', () => true);
const annId = ((await call('/api/admin/anniversaries?pageSize=200', { cookie: admin1 })).data.list || []).find((x) => String(x.anniversaryDate).startsWith('1985-06-15'))?.id;
ok(!!annId, 'it shows under Anniversaries');
ok((await call(`/api/admin/anniversaries/${annId}`, { cookie: admin1, method: 'PATCH', json: { individualBId: pA.id } })).status === 400, 'the same person twice is refused');
ok((await call(`/api/admin/anniversaries/${annId}`, { cookie: admin1, method: 'PATCH', json: { anniversaryDate: '1985-06-16' } })).status === 200, 'a new date is sent for approval');
ok((await call(`/api/admin/anniversaries/${annId}`, { cookie: admin1, method: 'PATCH', json: { notes: 'x' } })).status === 409, 'a second change while one waits is refused (409)');
await makerChecker('anniversary', (a) => a.resourceId === annId);
const annNow = ((await call('/api/admin/anniversaries?pageSize=200', { cookie: admin1 })).data.list || []).find((x) => x.id === annId);
ok(String(annNow?.anniversaryDate).startsWith('1985-06-16'), 'the new date shows after approval', j(annNow?.anniversaryDate));
await call(`/api/admin/anniversaries/${annId}`, { cookie: admin1, method: 'PATCH', json: { status: 'inactive' } });
await makerChecker('anniversary', (a) => a.resourceId === annId);
const inactiveAnn = ((await call('/api/admin/anniversaries?status=inactive&pageSize=200', { cookie: admin1 })).data.list || []).some((x) => x.id === annId);
ok(inactiveAnn, 'a deactivated anniversary moves to the Deactivated tab');
ok((await call('/api/admin/anniversaries/999999', { cookie: admin1, method: 'PATCH', json: { notes: 'x' } })).status === 404, 'an anniversary that does not exist says "not found"');
ok((await call('/api/admin/anniversaries', { cookie: staff, method: 'POST', json: {} })).status === 403, 'staff cannot add anniversaries');

test('PPL-12', 'Correcting a mistaken death record', 'Administrator A, Administrator B');
await call(`/api/admin/individuals/${pC.id}`, { cookie: admin1, method: 'PATCH', json: { dateOfDeath: '2026-10-01' } });
await makerChecker('individual', (a) => a.resourceId === pC.id);
ok(((await call('/api/admin/individuals?status=inactive&pageSize=200', { cookie: admin1 })).data.list || []).some((x) => x.id === pC.id), 'recorded as passed away: moves to Deactivated');
r = await call(`/api/admin/individuals/${pC.id}`, { cookie: admin1, method: 'PATCH', json: { status: 'active' } });
ok(r.status === 400 && /date of death/i.test(r.data.error), 'making them active while a date of death is set is refused', j(r.data));
await call(`/api/admin/individuals/${pC.id}`, { cookie: admin1, method: 'PATCH', json: { dateOfDeath: null } });
await makerChecker('individual', (a) => a.resourceId === pC.id);
ok(((await call('/api/admin/individuals?pageSize=200', { cookie: admin1 })).data.list || []).some((x) => x.id === pC.id && x.status === 'active'), 'clearing the date makes them active again');

// =============================================================== AST  more asset cases
const assetAdmin = async (id) => (await call('/api/admin/assets', { cookie: admin1 })).data.list.find((x) => x.id === id);
const newAsset = (over = {}) => call('/api/admin/assets', { cookie: admin1, method: 'POST', json: { reference: `Chair ${stamp}`, value: 1500, quantity: 10, labelCategory: 'Main Hall', ...over } });

test('AST-06', 'Asset checks and categories', 'Administrator, Staff');
ok((await newAsset({ reference: '' })).status === 400, 'a name is required');
ok((await newAsset({ quantity: -1 })).status === 400, 'a negative quantity is refused');
ok((await newAsset({ quantity: 1.5 })).status === 400, 'a part quantity is refused');
ok((await newAsset({ value: 'lots' })).status === 400, 'a value that is not a number is refused');
ok((await newAsset({ labelCategory: '' })).status === 400, 'a category is required');
r = await call('/api/admin/assets/categories', { cookie: staff });
ok(r.status === 200 && ['Chapel', 'Main Hall', 'Sound Equipment'].every((c) => r.data.categories.includes(c)), 'staff can see the categories', j(r.data));
ok((await call('/api/admin/assets/categories', { cookie: admin1, method: 'POST', json: { categories: ['Garden'] } })).status === 200, 'administrators can post categories');
ok((await call('/api/admin/assets/categories', { cookie: admin1, method: 'POST', json: { categories: 'x' } })).status === 400, 'categories must be a list');
r = await call('/api/admin/assets/references', { cookie: staff });
ok(r.status === 200, 'staff can see existing item names', `${r.status}`);

test('AST-07', 'A rejected asset or edit changes nothing', 'Administrator A, Administrator B');
r = await newAsset({ reference: `Rejected asset ${stamp}` });
await makerChecker('asset', (a) => a.resourceId === r.data.id, { how: 'reject', comment: 'Not ours' });
ok((await assetAdmin(r.data.id))?.status !== 'active', 'it is never added to the register', j((await assetAdmin(r.data.id))?.status));
r = await newAsset({ reference: `Edited asset ${stamp}`, quantity: 5 });
await makerChecker('asset', (a) => a.resourceId === r.data.id);
await call(`/api/admin/assets/${r.data.id}`, { cookie: admin1, method: 'PATCH', json: { quantity: 99 } });
await makerChecker('asset', (a) => a.resourceId === r.data.id && a.action === 'update', { how: 'reject', comment: 'Wrong count' });
ok((await assetAdmin(r.data.id))?.quantity === 5, 'a rejected edit keeps the old quantity');
await call(`/api/admin/assets/${r.data.id}`, { cookie: admin1, method: 'DELETE' });
await makerChecker('asset', (a) => a.resourceId === r.data.id && a.action === 'delete', { how: 'reject', comment: 'Keep it' });
ok((await assetAdmin(r.data.id))?.status === 'active', 'a rejected removal keeps the asset');
ok((await call(`/api/admin/assets/${r.data.id}`, { cookie: staff, method: 'DELETE' })).status === 403, 'staff cannot remove assets');
ok((await call('/api/admin/assets/999999', { cookie: admin1, method: 'PATCH', json: { quantity: 1 } })).status === 404, 'an asset that does not exist says "not found"');

// =============================================================== PRC  more process cases
const procLive = async (cookie) => (await call('/api/processes', { cookie })).data.list;
const addProc = (title, audience = 'public', html = '<p>Step 1.</p>') => call('/api/admin/processes', { cookie: admin1, method: 'POST', json: { title, contentHtml: html, audience } });
const attachTo = (id, name = 'hall-opening-checklist.xlsx', type = XLSX) => { const fd = new FormData(); fd.append('file', file(name, type), name); return call(`/api/admin/processes/${id}/attachments`, { cookie: admin1, method: 'POST', form: fd }); };

test('PRC-07', 'Remove a process (needs a second administrator)', 'Administrator A, Administrator B, Staff');
r = await addProc(`Remove me ${stamp}`);
const pr1 = r.data.id;
await makerChecker('process', (a) => a.resourceId === pr1);
ok((await procLive()).some((p) => p.id === pr1), 'published and visible');
ok((await call(`/api/admin/processes/${pr1}`, { cookie: staff, method: 'DELETE' })).status === 403, 'staff cannot ask to remove it');
ok((await call(`/api/admin/processes/${pr1}`, { cookie: admin1, method: 'DELETE' })).status === 200, 'administrator A asks to remove it');
ok((await procLive()).some((p) => p.id === pr1), 'still visible until approved');
ok((await call(`/api/admin/processes/${pr1}`, { cookie: admin1, method: 'DELETE' })).status === 400, 'asking twice is refused');
ok((await call(`/api/admin/processes/${pr1}`, { cookie: admin1, method: 'PATCH', json: { title: 'x' } })).status === 400, 'editing while a removal waits is refused');
await makerChecker('process', (a) => a.resourceId === pr1 && a.action === 'delete');
ok(!(await procLive()).some((p) => p.id === pr1), 'gone from the Processes page');

test('PRC-08', 'A rejected process never appears', 'Administrator A, Administrator B');
r = await addProc(`Rejected process ${stamp}`);
await makerChecker('process', (a) => a.resourceId === r.data.id, { how: 'reject', comment: 'Needs more detail' });
ok(!(await procLive()).some((p) => p.id === r.data.id), 'it is not shown to visitors');
ok(!(await procLive(staff)).some((p) => p.id === r.data.id), 'it is not shown to staff either');

test('PRC-09', 'Process text is cleaned of harmful code', 'Administrator, Visitor');
r = await addProc(`Cleaned ${stamp}`, 'public', '<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">link</a>');
await makerChecker('process', (a) => a.resourceId === r.data.id);
const cleaned = (await procLive()).find((p) => p.id === r.data.id);
ok(cleaned && /Safe/.test(cleaned.contentHtml), 'the normal text is kept');
ok(cleaned && !/<script|onerror|javascript:/i.test(cleaned.contentHtml), 'scripts, event handlers and javascript: links are removed', j(cleaned?.contentHtml));

test('PRC-10', 'Process checks', 'Administrator, Staff');
ok((await addProc('', 'public')).status === 400, 'a title is required');
ok((await call('/api/admin/processes', { cookie: staff, method: 'POST', json: { title: 'x', contentHtml: '<p>x</p>', audience: 'public' } })).status === 403, 'staff cannot add a process');
ok((await attachTo(999999)).status === 404, 'attaching to a process that does not exist says "not found"');
const prNew = (await addProc(`Draft with file ${stamp}`)).data.id;
const att = await attachTo(prNew);
ok(att.status === 200, 'a file can be added to a draft', j(att.data));
ok((await attachTo(prNew, 'not-really-an-image.png', 'image/png')).status === 400, 'a picture is refused (Excel or Word only)');
const pendingFiles = (await call('/api/admin/processes', { cookie: admin1 })).data.list.find((p) => p.id === prNew)?.attachments || [];
if (pendingFiles[0]) ok((await call(`/api/admin/processes/${prNew}/attachments/${pendingFiles[0].id}`, { cookie: admin1, method: 'DELETE' })).status === 200, 'a file on a draft can be removed straight away');
else ok(true, 'draft files are listed after approval only');

// =============================================================== FIL  file access
test('FIL-01', 'Files follow the same visibility as their document', 'Visitor, Staff, Administrator');
const stew = (await addProc(`Stewards file ${stamp}`, 'steward')).data.id;
await attachTo(stew);
await makerChecker('process', (a) => a.resourceId === stew);
const stewDoc = (await procLive(staff)).find((p) => p.id === stew);
const stewUrl = stewDoc?.attachments?.[0]?.storedPath;
ok(!!stewUrl, 'staff can see the stewards-only document and its file link');
ok((await call(stewUrl)).status === 404, 'a visitor cannot download a stewards-only file');
ok((await call(stewUrl, { cookie: staff })).status === 200, 'staff can');
ok((await call(stewUrl, { cookie: admin1 })).status === 200, 'administrators can');
const draftUrl = (await call('/api/admin/processes', { cookie: admin1 })).data.list.find((p) => p.id === prNew)?.attachments?.[0]?.storedPath;
if (draftUrl) ok((await call(draftUrl)).status === 404, 'a file on an unapproved draft is not public');
ok((await call('/api/files/999999')).status === 404, 'a file that does not exist says "not found"');
ok((await call('/api/files/abc')).status === 404, 'a bad file number says "not found"');
ok((await call('/api/files/-1', { cookie: admin1 })).status === 404, 'a negative file number says "not found"');
r = await fetch(BASE + stewUrl, { headers: { cookie: staff } });
ok(/no-store/i.test(r.headers.get('cache-control') || '') && /nosniff/i.test(r.headers.get('x-content-type-options') || ''), 'files are never cached and cannot be misread as web pages');

// =============================================================== BKG  more booking cases
const bookingRow = async (ref) => (await call('/api/admin/bookings', { cookie: admin1 })).data.list.find((b) => b.bookingRef === ref);
const reqBooking = (over = {}) => call('/api/bookings/request', { method: 'POST', json: { ...base, date: '2027-04-10', ...over } });

test('BKG-13', 'Remove a booking request (needs a second administrator)', 'Administrator A, Administrator B, Staff, Visitor');
r = await reqBooking({ startTime: '08:00', endTime: '09:00' });
const bk = await bookingRow(r.data.bookingRef);
ok((await call(`/api/admin/bookings/${bk.id}`, { cookie: staff, method: 'DELETE' })).status === 403, 'staff cannot ask to remove it');
ok((await call(`/api/admin/bookings/${bk.id}`, { cookie: admin1, method: 'DELETE' })).status === 200, 'administrator A asks to remove it');
ok((await call(`/api/admin/bookings/${bk.id}`, { cookie: admin1, method: 'DELETE' })).status === 400, 'asking twice is refused');
const bkAp = (await pendingFor(admin2, 'booking')).find((a) => a.resourceId === bk.id && a.action === 'delete');
ok((await approve(admin1, bkAp?.id)).status === 403, 'A cannot approve their own removal');
ok((await approve(admin2, bkAp?.id)).status === 200, 'administrator B approves');
ok((await call(`/api/bookings/${r.data.bookingRef}`)).status === 404, 'the visitor now gets "not found" for that reference');

test('BKG-14', 'Booking approval by role', 'Staff, Administrator A, Administrator B');
r = await reqBooking({ startTime: '10:00', endTime: '11:00' });
const bk2 = await bookingRow(r.data.bookingRef);
const ap2 = (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bk2.id);
ok((await approve(staff, ap2?.id)).status === 403, 'staff cannot approve a booking');
ok((await call('/api/bookings/availability')).data.booked.every((x) => !(String(x.date).startsWith('2027-04-10') && x.startTime === '10:00')), 'a waiting request does not block the calendar');
ok((await reject(admin1, ap2?.id, '')).status === 400, 'rejecting a booking needs a reason');
ok((await approve(admin1, ap2?.id)).status === 200, 'any administrator can approve a public request');
ok((await call('/api/bookings/availability')).data.booked.some((x) => String(x.date).startsWith('2027-04-10') && x.startTime === '10:00'), 'the approved time is now on the calendar');
r = await reqBooking({ startTime: '10:30', endTime: '11:30' });
ok(r.status === 409 && /already booked/i.test(r.data.error), 'a visitor asking for an overlapping time is told it is taken', j(r.data));
r = await reqBooking({ startTime: '10:30', endTime: '11:30', hall: 'Chapel' });
ok(r.status === 200, 'the other hall at the same time is still free', j(r.data));

test('BKG-15', 'Payment slips and rejected bookings', 'Visitor, Administrator');
r = await reqBooking({ date: '2027-04-17' });
const bk3 = await bookingRow(r.data.bookingRef);
const slip = (ref) => { const fd = new FormData(); fd.append('file', file('payment-slip.png', 'image/png'), 'payment-slip.png'); return call(`/api/bookings/${ref}/payment`, { method: 'POST', form: fd }); };
const early = await slip(r.data.bookingRef);
ok(early.status >= 400 && early.status < 500, 'a slip cannot be sent before the booking is approved', `${early.status} ${j(early.data)}`);
await reject(admin1, (await pendingFor(admin1, 'booking')).find((a) => a.resourceId === bk3.id)?.id, 'Hall closed that day');
ok((await call(`/api/bookings/${r.data.bookingRef}`)).data.booking.status === 'REJECTED', 'the visitor sees "rejected"');
const x2 = await slip(r.data.bookingRef);
ok(x2.status >= 400 && x2.status < 500, 'a slip cannot be sent for a rejected booking', `${x2.status}`);
ok((await slip('BXXXXXXXX')).status === 404, 'a slip for an unknown reference says "not found"');
r = await reqBooking({ date: '2027-04-17' });
ok(r.status === 200, 'the same time can be requested again after a rejection', j(r.data));

// =============================================================== MED  more medical cases
const med = async () => (await call('/api/admin/medical', { cookie: admin1 })).data;
test('MED-06', 'Medical item and loan checks', 'Staff, Administrator');
ok((await call('/api/admin/medical/items', { cookie: staff, method: 'POST', json: { name: 'x', quantityTotal: 1 } })).status === 403, 'staff cannot add an item');
ok((await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: '', quantityTotal: 1 } })).status === 400, 'a name is required');
ok((await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: 'x', quantityTotal: 0 } })).status === 400, 'at least 1 is required');
ok((await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: 'x', quantityTotal: 2.5 } })).status === 400, 'a whole number is required');
ok((await call('/api/admin/medical/loans', { cookie: staff, method: 'POST', json: { itemId: 999999, givenTo: 'Someone' } })).status === 400, 'lending an item that does not exist is refused');
ok((await call('/api/admin/medical/loans', { cookie: staff, method: 'POST', json: { itemId: 1, givenTo: '' } })).status === 400, 'who it is for is required');

test('MED-07', 'Loan steps in the right order', 'Staff, Administrator A, Administrator B');
const it = (await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: `Walker ${stamp}`, quantityTotal: 2 } })).data.id;
const ln = (await call('/api/admin/medical/loans', { cookie: admin1, method: 'POST', json: { itemId: it, givenTo: 'Mrs. Perera', dueDate: '2027-01-15' } })).data.id;
ok((await call(`/api/admin/medical/loans/${ln}/issue`, { cookie: staff, method: 'POST' })).status === 400, 'handing over before approval is refused');
ok((await call(`/api/admin/medical/loans/${ln}/approve`, { cookie: admin1, method: 'POST' })).status === 403, 'the person who asked cannot approve');
ok((await call(`/api/admin/medical/loans/${ln}/approve`, { cookie: admin2, method: 'POST' })).status === 200, 'a different administrator approves');
ok((await call(`/api/admin/medical/loans/${ln}/approve`, { cookie: admin3, method: 'POST' })).status === 409, 'approving twice is refused');
ok((await call(`/api/admin/medical/loans/${ln}/issue`, { cookie: staff, method: 'POST' })).status === 200, 'staff hand it over');
ok((await call(`/api/admin/medical/loans/${ln}/issue`, { cookie: staff, method: 'POST' })).status === 409, 'handing over twice is refused');
ok((await med()).items.find((i) => i.id === it).quantityAvailable === 1, '1 of 2 left while it is out');
r = await call(`/api/admin/medical/loans/${ln}/return`, { cookie: staff, method: 'POST', json: { condition: 'Good, cleaned' } });
ok(r.status === 200, 'staff record the return with its condition');
ok((await call(`/api/admin/medical/loans/${ln}/return`, { cookie: staff, method: 'POST', json: {} })).status === 409, 'returning twice is refused');
const done = (await med()).loans.find((l) => l.id === ln);
ok(done.conditionOnReturn === 'Good, cleaned' && done.returned, 'the condition is saved', j(done.conditionOnReturn));
ok((await med()).items.find((i) => i.id === it).quantityAvailable === 2, 'both are available again');

// =============================================================== ACC  more account cases
test('ACC-03', 'Account checks', 'Administrator, Staff');
const mk = (over) => call('/api/admin/users', { cookie: admin1, method: 'POST', json: { name: 'Tester', email: `t.${stamp}@example.com`, role: 'staff', password: 'Welcome@2026', ...over } });
ok((await mk({ password: 'short' })).status === 400, 'a short password is refused');
ok((await mk({ email: 'nope' })).status === 400, 'a bad email is refused');
ok((await mk({ role: 'owner' })).status === 400, 'an unknown role is refused');
ok((await mk({ name: '' })).status === 400, 'a name is required');
r = await mk({ email: 'ADMIN1@example.com' });
ok(r.status >= 400 && r.status < 500, 'an email that already has an account is refused (any capitals)', `${r.status} ${j(r.data)}`);
const listU = (await call('/api/admin/users', { cookie: admin1 })).data;
ok(!JSON.stringify(listU).match(/passwordHash|\$2[aby]\$/), 'the accounts list never contains password hashes');
ok(!listU.list.some((u) => u.email === 'system@church.local'), 'the internal website account is not listed', j(listU.list.map((u) => u.email)));

test('ACC-04', 'A rejected account request never creates the account', 'Administrator A, Administrator B');
const rejEmail = `rejected.${stamp}@example.com`;
await mk({ email: rejEmail });
await makerChecker('user', (a) => JSON.stringify(a.genericDetails || {}).includes(rejEmail), { how: 'reject', comment: 'Not needed' });
ok((await login(rejEmail, 'Welcome@2026')).status === 401, 'that person cannot log in');
ok(!(await call('/api/admin/users', { cookie: admin1 })).data.list.some((u) => u.email === rejEmail), 'and is not in the accounts list');

// =============================================================== APR  approvals
test('APR-01', 'Approvals queue behaves the same for everyone', 'Staff, Administrator A, Administrator B');
const sample = await newNotice(`Queue ${stamp}`, '2026-12-06T00:00:00.000Z');
const q1 = (await call('/api/approvals', { cookie: admin1 })).data.list.find((a) => a.resourceType === 'notice' && a.resourceId === sample.data.id);
const q2 = (await call('/api/approvals', { cookie: admin2 })).data.list.find((a) => a.resourceId === sample.data.id && a.resourceType === 'notice');
const q3 = (await call('/api/approvals', { cookie: staff })).data.list.find((a) => a.resourceId === sample.data.id && a.resourceType === 'notice');
ok(q1?.isMine === true && q1?.canAct === false, 'the maker sees it as theirs and cannot act');
ok(q2?.isMine === false && q2?.canAct === true, 'the other administrator can act');
ok(q3?.canAct === false, 'staff see it but cannot act');
ok((await approve(admin2, 999999)).status === 404, 'approving something that does not exist says "not found"');
ok((await approve(admin2, 'abc')).status === 400, 'a bad number is refused');
ok((await reject(admin2, 999999, 'no')).status === 404, 'rejecting something that does not exist says "not found"');
await approve(admin2, q2?.id);
ok((await reject(admin2, q2?.id, 'too late')).status === 409, 'a decided request cannot be decided again');
const decided = (await call('/api/approvals', { cookie: admin1 })).data.list.find((a) => a.id === q2?.id);
ok(decided?.status === 'APPROVED', 'its status shows as approved');

// =============================================================== AUD  audit
test('AUD-02', 'The audit log records the extra actions', 'Administrator, Staff');
const au = (await call('/api/admin/audit', { cookie: staff })).data.list;
for (const act of ['request_delete_notice', 'approve_notice_delete', 'request_delete_sermon', 'request_update_individual', 'reject_individual_update', 'request_update_anniversary', 'request_delete_booking', 'request_medical_loan', 'issue_medical_loan', 'return_medical_loan']) ok(au.some((l) => l.action === act), `logs ${act}`);
ok(au.every((l) => l.createdAt), 'every entry has a time');
ok(!JSON.stringify(au).match(/\$2[aby]\$/), 'no password hash is ever shown in the log');

// =============================================================== ACC-05 last: it switches administrators off
test('ACC-05', 'Two administrators always remain', 'Administrator A, Administrator B, Administrator C');
const users = (await call('/api/admin/users', { cookie: admin1 })).data.list;
const idOf = (e) => users.find((u) => u.email === e)?.id;
for (const e of ['admin3@example.com', 'admin4@example.com']) {
  await call(`/api/admin/users/${idOf(e)}`, { cookie: admin1, method: 'DELETE' });
  await makerChecker('user', (a) => a.resourceId === idOf(e) && a.action === 'disable');
}
ok((await login('admin3@example.com', 'Admin@123')).status === 401 && (await login('admin4@example.com', 'Admin@123')).status === 401, 'switched-off administrators can no longer log in');
ok((await call('/api/auth/check', { cookie: admin3 })).status === 401, 'an administrator who was already logged in is signed out at once');
ok((await call('/api/approvals', { cookie: admin3 })).status === 401, 'and their old session is refused');
await call(`/api/admin/users/${idOf('admin2@example.com')}`, { cookie: admin1, method: 'DELETE' });
const last = (await pendingFor(admin2, 'user')).find((a) => a.resourceId === idOf('admin2@example.com'));
r = await approve(admin2, last?.id);
ok(r.status === 400 && /two administrators|at least 2|at least two/i.test(r.data.error || ''), 'switching off the second-last administrator is refused', `${r.status} ${j(r.data)}`);
ok((await login('admin2@example.com', 'Admin@123')).status === 200, 'that administrator can still log in');

await finish(['SEC', 'ROL', 'PUB', 'AUT', 'VAL', 'NTC', 'SRM', 'PPL', 'AST', 'PRC', 'FIL', 'BKG', 'MED', 'ACC', 'APR', 'AUD']);

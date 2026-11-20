/**
 * API checks for dual control, permissions, files and bookings.
 * Run against a seeded database:  BASE_URL=http://localhost:3000 node tests/dual-control.api.mjs
 * Uses the demo accounts from scripts/seed.js and scripts/seed-extra-staff-admins.js.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let failures = 0;
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && extra ? `  -> ${extra}` : ''}`);
  if (!cond) failures++;
};

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

const pending = async (cookie, type) =>
  (await call('/api/approvals', { cookie })).data.list.filter((a) => a.status === 'SUBMITTED' && a.resourceType === type);

const admin1 = (await login('admin1@example.com', 'Admin@123')).cookie;
const admin2 = (await login('admin2@example.com', 'Admin@123')).cookie;
const staff = (await login('staff@example.com', 'Staff@123')).cookie;
ok(admin1 && admin2 && staff, 'demo accounts can log in');

// --- Access ---
ok((await call('/api/approvals')).status === 401, 'approvals list is not public');
ok((await login('system@church.local', 'system')).status === 401, 'internal system account cannot log in');

// --- Notice: maker + checker ---
const stamp = Date.now();
const n = await call('/api/admin/notices', {
  cookie: admin1, method: 'POST',
  json: { title: `Test notice ${stamp}`, bodyHtml: '<p>Hello</p><img src=x onerror="alert(1)"><script>alert(2)</script>', weekOf: new Date().toISOString() },
});
ok(n.status === 200, 'admin can submit a notice', JSON.stringify(n.data));
const pubBefore = (await call('/api/notices')).data.list.some((x) => x.id === n.data.id);
ok(!pubBefore, 'notice is not visible before approval');
const nAp = (await pending(admin1, 'notice')).find((a) => a.resourceId === n.data.id);
ok(nAp && nAp.canAct === false && nAp.isMine === true, 'maker sees no approve button on own notice');
let r = await call('/api/approvals/approve', { cookie: admin1, method: 'POST', json: { approvalId: nAp.id } });
ok(r.status === 403, 'maker cannot approve own notice', JSON.stringify(r.data));
r = await call('/api/approvals/approve', { cookie: staff, method: 'POST', json: { approvalId: nAp.id } });
ok(r.status === 403, 'staff cannot approve');
r = await call('/api/approvals/approve', { cookie: admin2, method: 'POST', json: { approvalId: nAp.id } });
ok(r.status === 200, 'a different admin can approve', JSON.stringify(r.data));
r = await call('/api/approvals/approve', { cookie: admin2, method: 'POST', json: { approvalId: nAp.id } });
ok(r.status === 409, 'cannot approve the same request twice');
const pub = (await call('/api/notices')).data.list.find((x) => x.id === n.data.id);
ok(!!pub, 'notice is visible immediately after approval (not cached)');
ok(pub && !/onerror|<script/i.test(pub.bodyHtml), 'harmful HTML is removed from notices', pub?.bodyHtml);

// --- Asset: pending until approved ---
const a = await call('/api/admin/assets', {
  cookie: admin1, method: 'POST', json: { reference: `Microphone ${stamp}`, value: 25000, quantity: 2, labelCategory: 'Chapel', id: 999999, status: 'active' },
});
ok(a.status === 200, 'admin can submit an asset', JSON.stringify(a.data));
let assets = (await call('/api/admin/assets', { cookie: admin1 })).data.list;
ok(assets.find((x) => x.id === a.data.id)?.status === 'pending', 'new asset is pending, extra fields ignored');
ok((await call('/api/admin/assets', { cookie: staff, method: 'POST', json: { reference: 'x', value: 1, quantity: 1, labelCategory: 'Hall' } })).status === 403, 'staff cannot add assets');
const aAp = (await pending(admin2, 'asset')).find((x) => x.resourceId === a.data.id);
await call('/api/approvals/approve', { cookie: admin2, method: 'POST', json: { approvalId: aAp.id } });
assets = (await call('/api/admin/assets', { cookie: admin1 })).data.list;
ok(assets.find((x) => x.id === a.data.id)?.status === 'active', 'asset becomes active after approval');

// --- People register ---
ok((await call('/api/admin/individuals', { cookie: staff, method: 'POST', json: { displayName: 'X', birthDate: '1950-01-01' } })).status === 403, 'staff cannot add people');
const p = await call('/api/admin/individuals', { cookie: admin1, method: 'POST', json: { displayName: `Mary Test ${stamp}`, birthDate: '1948-03-14' } });
ok(p.status === 200, 'admin submits a person for approval', JSON.stringify(p.data));
let people = (await call('/api/admin/individuals?pageSize=100', { cookie: admin1 })).data.list;
ok(!people.some((x) => x.displayName === `Mary Test ${stamp}`), 'person not in register before approval');
const pAp = (await pending(admin2, 'individual')).find((x) => x.genericDetails?.rows?.[0]?.[1] === `Mary Test ${stamp}`);
ok(!!pAp, 'approval shows readable person details');
r = await call('/api/approvals/approve', { cookie: admin2, method: 'POST', json: { approvalId: pAp.id } });
ok(r.status === 200, 'person approved', JSON.stringify(r.data));
people = (await call('/api/admin/individuals?pageSize=100', { cookie: admin1 })).data.list;
const mary = people.find((x) => x.displayName === `Mary Test ${stamp}`);
ok(!!mary, 'person appears after approval');
r = await call(`/api/admin/individuals/${mary.id}`, { cookie: admin1, method: 'PATCH', json: { status: 'inactive' } });
ok(r.status === 400 && /date of death/i.test(r.data.error), 'marking deceased requires a date of death');
r = await call(`/api/admin/individuals/${mary.id}`, { cookie: admin1, method: 'PATCH', json: { dateOfDeath: '2026-11-01' } });
ok(r.status === 200, 'date of death submitted for approval');

// --- Hall rate ---
ok((await call('/api/admin/hall-booking-settings', { cookie: staff, method: 'PATCH', json: { ratePer30Minutes: 1 } })).status === 403, 'staff cannot change the hall rate');
r = await call('/api/admin/hall-booking-settings', { cookie: admin1, method: 'PATCH', json: { ratePer30Minutes: 1500 } });
ok(r.status === 200 && r.data.pending, 'rate change goes for approval');
const hAp = (await pending(admin2, 'hall_settings'))[0];
await call('/api/approvals/approve', { cookie: admin2, method: 'POST', json: { approvalId: hAp.id } });
ok((await call('/api/admin/hall-booking-settings', { cookie: admin1 })).data.ratePer30Minutes === 1500, 'rate applied after approval');

// --- Bookings: clash, payment slip, file access, paid cannot be cancelled ---
const day = new Date(Date.now() + (30 + (stamp % 300)) * 86400000).toISOString().slice(0, 10);
const req1 = await call('/api/bookings/request', {
  method: 'POST', json: { fullName: 'John Perera', email: 'john@example.com', phone: '0771234567', purpose: 'Birthday party', date: day, startTime: '10:00', endTime: '12:00', hall: 'Main Hall' },
});
ok(req1.status === 200 && /^B[A-Z2-9]{8}$/.test(req1.data.bookingRef), 'public can request a booking', JSON.stringify(req1.data));
ok((await call('/api/bookings/request', { method: 'POST', json: { purpose: 'x', date: day, startTime: '10:00', endTime: '11:00', hall: 'Main Hall' } })).status === 400, 'booking needs name, email and phone');
const req2 = await call('/api/bookings/request', {
  method: 'POST', json: { fullName: 'Ann Silva', email: 'ann@example.com', phone: '0777654321', purpose: 'Meeting', date: day, startTime: '11:00', endTime: '13:00', hall: 'Main Hall' },
});
const bookings = (await call('/api/admin/bookings', { cookie: admin1 })).data.list;
const b1 = bookings.find((b) => b.bookingRef === req1.data.bookingRef);
const b2 = bookings.find((b) => b.bookingRef === req2.data.bookingRef);
const b1Ap = (await pending(admin1, 'booking')).find((x) => x.resourceId === b1.id);
ok(b1Ap.canAct === true, 'any admin can act on a public booking');
r = await call('/api/approvals/approve', { cookie: admin1, method: 'POST', json: { approvalId: b1Ap.id } });
ok(r.status === 200, 'booking 1 approved', JSON.stringify(r.data));
const b2Ap = (await pending(admin1, 'booking')).find((x) => x.resourceId === b2.id);
r = await call('/api/approvals/approve', { cookie: admin1, method: 'POST', json: { approvalId: b2Ap.id } });
ok(r.status === 400 && /clash/i.test(r.data.error), 'overlapping booking cannot be approved', JSON.stringify(r.data));
r = await call('/api/bookings/request', {
  method: 'POST', json: { fullName: 'Late Comer', email: 'l@example.com', phone: '0770000000', purpose: 'Choir', date: day, startTime: '11:30', endTime: '12:30', hall: 'Main Hall' },
});
ok(r.status === 409, 'new request for an approved slot is refused');
ok((await call('/api/bookings/availability')).data.booked.some((x) => x.startTime === '10:00'), 'calendar shows approved booking');

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const fd = new FormData();
fd.append('file', new Blob([png], { type: 'image/png' }), 'slip.png');
fd.append('paymentRef', 'TXN-123');
r = await call(`/api/bookings/${req1.data.bookingRef}/payment`, { method: 'POST', form: fd });
ok(r.status === 200, 'payment slip upload works', JSON.stringify(r.data));
const fake = new FormData();
fake.append('file', new Blob(['<html>'], { type: 'image/png' }), 'evil.png');
fake.append('paymentRef', 'x');
ok((await call(`/api/bookings/${req1.data.bookingRef}/payment`, { method: 'POST', form: fake })).status === 400, 'non-image file pretending to be PNG is refused');
const pubView = (await call(`/api/bookings/${req1.data.bookingRef}`)).data.booking;
ok(pubView.slipReceived === true && pubView.slipUrl === undefined, 'public booking page shows "received" but no file link');
const slipUrl = (await call('/api/admin/bookings', { cookie: admin1 })).data.list.find((b) => b.id === b1.id).slipUrl;
ok(/^\/api\/files\/\d+$/.test(slipUrl), 'slip stored in database');
ok((await call(slipUrl)).status === 404, 'slip hidden from the public');
ok((await call(slipUrl, { cookie: staff })).status === 200, 'staff can view slip');
const payAp = (await pending(admin1, 'booking')).find((x) => x.resourceId === b1.id && x.action === 'confirm_payment');
r = await call('/api/approvals/approve', { cookie: admin1, method: 'POST', json: { approvalId: payAp.id } });
ok(r.status === 200, 'payment confirmed', JSON.stringify(r.data));
r = await call(`/api/admin/bookings/${b1.id}`, { cookie: admin1, method: 'DELETE' });
ok(r.status === 400 && /paid/i.test(r.data.error), 'paid booking cannot be cancelled');

// --- Medical: staff request, admin (not requester) approves ---
const item = await call('/api/admin/medical/items', { cookie: admin1, method: 'POST', json: { name: `Wheelchair ${stamp}`, quantityTotal: 1 } });
ok(item.status === 200, 'admin adds a medical item');
const loan = await call('/api/admin/medical/loans', { cookie: staff, method: 'POST', json: { itemId: item.data.id, givenTo: 'Mr Fernando' } });
ok(loan.status === 200, 'staff can request a loan');
ok((await call('/api/admin/medical/loans', { cookie: staff, method: 'POST', json: { itemId: item.data.id, givenTo: 'Someone else' } })).status === 400, 'cannot lend more than available');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/approve`, { cookie: staff, method: 'POST' })).status === 403, 'staff cannot approve a loan');
ok((await call(`/api/admin/medical/loans/${loan.data.id}/approve`, { cookie: admin1, method: 'POST' })).status === 200, 'admin approves the loan');

// --- Audit log covers the above ---
const log = (await call('/api/admin/audit', { cookie: admin1 })).data.list.map((l) => l.action);
for (const act of ['request_publish_notice', 'approve_notice_publish', 'request_create_asset', 'approve_individual_create', 'approve_hall_settings_update', 'approve_booking_confirm_payment', 'approve_medical_loan']) {
  ok(log.includes(act), `audit log records ${act}`);
}

// --- Login lockout (run last: locks staff3 for 15 minutes) ---
for (let i = 0; i < 5; i++) await login('staff3@example.com', 'wrong-password');
const locked = await login('staff3@example.com', 'Staff@123');
ok(locked.status === 429, 'account locks after 5 wrong passwords', JSON.stringify(locked.data));

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

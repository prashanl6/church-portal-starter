/**
 * Safe checks for the LIVE site. Read-only: it never logs in, never creates or changes anything.
 *
 *   npm run test:live                      (checks the production address)
 *   BASE_URL=https://example.org npm run test:live
 *
 * The full suites (npm test) change data and only run against a local copy.
 */
const BASE = (process.env.BASE_URL || 'https://church-portal-starter-enbf.vercel.app').replace(/\/$/, '');
const results = [];
const check = (area, label, pass, extra = '') => results.push({ area, label, pass: !!pass, extra: pass ? '' : extra });
const get = async (path, init) => { const t = performance.now(); const r = await fetch(BASE + path, { redirect: 'manual', ...init }); const body = await r.text(); return { r, body, ms: Math.round(performance.now() - t) }; };

const PUBLIC = ['/', '/notices', '/sermons', '/processes', '/book-hall', '/login', '/booking/BNOSUCHREF', '/api/notices', '/api/sermons', '/api/processes', '/api/bookings/pricing', '/api/bookings/availability', '/api/auth/bootstrap-eligible', '/api/approvals/count'];
for (const p of PUBLIC) { await get(p); const x = await get(p); check('Public pages', `${p} opens (${x.ms} ms)`, x.r.status === 200 && x.ms < 2000, `${x.r.status} ${x.ms} ms`); }
check('Public pages', 'a wrong address says "not found"', (await get('/no-such-page')).r.status === 404);

const PRIVATE = ['/api/approvals', '/api/admin/users', '/api/admin/anniversaries', '/api/admin/assets', '/api/admin/assets/categories', '/api/admin/assets/references', '/api/admin/audit', '/api/admin/bookings', '/api/admin/church-bank-account', '/api/admin/hall-booking-settings', '/api/admin/individuals', '/api/admin/medical', '/api/admin/notices', '/api/admin/processes', '/api/admin/sermons'];
for (const p of PRIVATE) check('Private data', `${p} refuses a visitor`, (await get(p)).r.status === 401, 'not 401');
const WRITES = [['POST', '/api/admin/users'], ['POST', '/api/admin/notices'], ['POST', '/api/admin/sermons'], ['POST', '/api/admin/individuals'], ['POST', '/api/admin/anniversaries'], ['POST', '/api/admin/assets'], ['POST', '/api/admin/medical/items'], ['POST', '/api/admin/medical/loans'], ['POST', '/api/admin/processes'], ['POST', '/api/admin/church-bank-account'], ['PATCH', '/api/admin/hall-booking-settings'], ['POST', '/api/approvals/approve'], ['POST', '/api/approvals/reject'], ['DELETE', '/api/admin/notices/1'], ['DELETE', '/api/admin/sermons/1'], ['DELETE', '/api/admin/bookings/1'], ['DELETE', '/api/admin/users/1'], ['POST', '/api/admin/medical/loans/1/approve']];
for (const [m, p] of WRITES) check('Private data', `${m} ${p} refuses a visitor`, (await get(p, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'DELETE' ? undefined : '{}' })).r.status === 401, 'not 401');
for (const p of ['/admin', '/admin/approvals', '/admin/accounts', '/admin/people', '/admin/assets', '/admin/medical', '/admin/notices']) {
  const x = await get(p);
  check('Private data', `${p} sends a visitor to log in`, [307, 308].includes(x.r.status) && /\/login\?next=/.test(x.r.headers.get('location') || ''), `${x.r.status}`);
}
check('Private data', 'a made-up login token is refused', (await get('/api/approvals', { headers: { cookie: 'token=abc.def.ghi' } })).r.status === 401);
check('Private data', 'the internal account cannot log in', (await get('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'system@church.local', password: 'system' }) })).r.status === 401);
check('Private data', 'first-time setup is closed', JSON.parse((await get('/api/auth/bootstrap-eligible')).body).eligible === false);

const home = await get('/');
for (const [k, rx] of [['x-frame-options', /^DENY$/], ['x-content-type-options', /nosniff/], ['referrer-policy', /strict-origin/], ['strict-transport-security', /max-age=\d{7,}/], ['content-security-policy', /frame-ancestors 'none'/]]) check('Browser protections', `${k} is set`, rx.test(home.r.headers.get(k) || ''), home.r.headers.get(k) || 'missing');

const av = (await get('/api/bookings/availability')).body;
check('Privacy', 'the booking calendar shows no names, phones or emails', !/@|requesterName|phone|purpose/i.test(av));
check('Privacy', 'an unknown booking reference is "not found"', (await get('/api/bookings/BXXXXXXXX')).r.status === 404);
const notices = JSON.parse((await get('/api/notices')).body).list || [];
const sunday = (() => { const l = new Date(Date.now() + 5.5 * 3600000); l.setUTCDate(l.getUTCDate() + ((7 - l.getUTCDay()) % 7)); l.setUTCHours(23, 59, 59, 999); return l; })();
check('Notices', 'visitors see no notice dated after the coming Sunday', notices.every((n) => new Date(n.weekOf) <= sunday), notices.map((n) => n.weekOf).join());
check('Notices', 'at least one notice is published', notices.length > 0);
check('Sermons', 'at least one sermon is published', (JSON.parse((await get('/api/sermons')).body).list || []).length > 0);
const procs = JSON.parse((await get('/api/processes')).body).list || [];
check('Guides', 'public guides are listed', procs.length > 0);
const files = procs.flatMap((p) => p.attachments || []);
for (const f of files.slice(0, 3)) { const x = await get(f.storedPath); check('Guides', `${f.fileName} downloads`, x.r.status === 200 && x.body.length > 500, `${x.r.status}`); }
const rate = JSON.parse((await get('/api/bookings/pricing')).body).ratePer30Minutes;
check('Hall booking', 'a hall rate is set', Number(rate) > 0, String(rate));
for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) { const x = await get(`/api/files/${id}`); if (x.r.status === 200) check('Files', `/api/files/${id} is a public guide file`, /spreadsheet|wordprocessing|msword/.test(x.r.headers.get('content-type') || ''), x.r.headers.get('content-type')); }
check('Settings', 'the scheduled job is not open to everyone (CRON_SECRET set)', (await get('/api/cron/booking-auto-cancel')).r.status === 401, 'answers 200 without a secret: set CRON_SECRET in Vercel');

let failed = 0;
let area = '';
for (const t of results) { if (t.area !== area) { console.log(`\n${t.area}`); area = t.area; } if (!t.pass) failed++; console.log(`  ${t.pass ? 'PASS' : 'FAIL'}  ${t.label}${t.extra ? `  -> ${t.extra}` : ''}`); }
console.log(`\n${results.length - failed} of ${results.length} live checks passed (${BASE}).`);
process.exit(failed ? 1 : 0);

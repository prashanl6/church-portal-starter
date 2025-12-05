const fetch = global.fetch || require('node-fetch');
const fs = require('fs');

function getBaseUrlFromLog() {
  try {
    const data = fs.readFileSync('/tmp/next-dev.log', 'utf8');
    const m = data.match(/Local:\s*(http:\/\/localhost:[0-9]+)/);
    if (m) return m[1];
  } catch (e) {
    // ignore
  }
  return process.env.BASE_URL || 'http://localhost:3001';
}

function extractTokenFromSetCookie(sc) {
  if (!sc) return null;
  const m = sc.match(/token=([^;]+)/);
  return m ? m[1] : null;
}

async function login(base, creds) {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds)
  });
  const sc = res.headers.get('set-cookie') || res.headers.get('Set-Cookie');
  const token = extractTokenFromSetCookie(sc || '');
  return { ok: res.ok, token, status: res.status };
}

async function postJson(base, path, cookie, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, cookie ? { Cookie: 'token=' + cookie } : {}),
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  return { ok: res.ok, status: res.status, json };
}

async function getJson(base, path, cookie) {
  const res = await fetch(base + path, { headers: cookie ? { Cookie: 'token=' + cookie } : {} });
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  return { ok: res.ok, status: res.status, json };
}

async function run() {
  const base = getBaseUrlFromLog();
  console.log('Using base URL:', base);

  // Credentials
  const admin1 = { email: 'admin1@example.com', password: 'Admin@123' };
  const admin2 = { email: 'admin2@example.com', password: 'Admin@123' };
  const staff = { email: 'staff@example.com', password: 'Staff@123' };

  // Sermon payload (no `theme` field to match current prisma schema)
  const payload = {
    title: 'Prashan First Publish',
    speaker: 'Prashan',
    link: 'https://www.facebook.com/share/v/1Bi9rF3Lna/',
    date: '2025-11-23T00:00:00.000Z'
  };

  console.log('Logging in as admin1...');
  const l1 = await login(base, admin1);
  if (!l1.ok || !l1.token) {
    console.error('admin1 login failed', l1);
    process.exitCode = 2; return;
  }
  console.log('admin1 token obtained');

  console.log('Submitting sermon as admin1 (status=submitted)');
  const create = await postJson(base, '/api/admin/sermons', l1.token, payload);
  if (!create.ok) {
    console.error('Create sermon failed', create.status, create.json);
    process.exitCode = 3; return;
  }
  const id = create.json && create.json.id;
  console.log('Sermon created (submitted) id=', id);

  console.log('Logging in as admin2...');
  const l2 = await login(base, admin2);
  if (!l2.ok || !l2.token) {
    console.error('admin2 login failed', l2); process.exitCode = 4; return;
  }

  console.log('Approver1 (admin2) approving...');
  const a1 = await postJson(base, '/api/approvals/approve', l2.token, { resourceType: 'sermon', resourceId: id, comment: 'approver1 ok' });
  console.log('approver1 response', a1.status, a1.json);
  if (!a1.ok) { console.error('approver1 failed'); process.exitCode = 5; return; }

  console.log('Logging in as staff...');
  const ls = await login(base, staff);
  if (!ls.ok || !ls.token) { console.error('staff login failed', ls); process.exitCode = 6; return; }

  console.log('Approver2 (staff) approving...');
  const a2 = await postJson(base, '/api/approvals/approve', ls.token, { resourceType: 'sermon', resourceId: id, comment: 'approver2 ok' });
  console.log('approver2 response', a2.status, a2.json);
  if (!a2.ok) { console.error('approver2 failed'); process.exitCode = 7; return; }

  console.log('Fetching admin sermons to verify status...');
  const list = await getJson(base, '/api/admin/sermons', l1.token);
  if (!list.ok) { console.error('fetch admin sermons failed', list.status); process.exitCode = 8; return; }
  const found = (list.json.list || []).find(s => Number(s.id) === Number(id));
  if (!found) { console.error('created sermon not found in admin list'); process.exitCode = 9; return; }
  console.log('Sermon status after approvals:', found.status);
  if (found.status === 'published' || found.status === 'PUBLISHED') {
    console.log('Sermon successfully published. URL:', base + '/sermons');
  } else {
    console.warn('Sermon not published; current status:', found.status);
  }
}

if (require.main === module) run().catch(e => { console.error(e); process.exitCode = 99; });

module.exports = { run };

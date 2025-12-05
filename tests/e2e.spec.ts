import { test, expect, request } from '@playwright/test';

// End-to-end test that mirrors the shell e2e script:
// 1. Login admin1, create a notice (status: submitted)
// 2. Login admin2, approve (approver1)
// 3. Login staff, approve (approver2)
// 4. Fetch /api/notices and assert the notice is published

const ADMIN1 = { email: 'admin1@example.com', password: 'Admin@123' };
const ADMIN2 = { email: 'admin2@example.com', password: 'Admin@123' };
const STAFF = { email: 'staff@example.com', password: 'Staff@123' };

function extractCookieToken(setCookieHeader: string | undefined) {
  if (!setCookieHeader) return '';
  const m = setCookieHeader.match(/token=[^;]+/);
  return m ? m[0] : '';
}

test('notice publish workflow (API)', async () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const api = await request.newContext({ baseURL });

  // helper: login and return cookie header string
  const loginGetCookie = async (email: string, password: string) => {
    const r = await api.post('/api/auth/login', { data: { email, password } });
    expect(r.ok()).toBeTruthy();
    const sc = r.headers()['set-cookie'];
    const cookie = extractCookieToken(sc);
    expect(cookie).toBeTruthy();
    return cookie;
  };

  // 1. login admin1
  const cookieAdmin1 = await loginGetCookie(ADMIN1.email, ADMIN1.password);

  // 2. create notice as admin1
  const noticePayload = {
    title: 'Playwright E2E Test Notice',
    bodyHtml: '<p>Playwright testing publish flow</p>',
    weekOf: new Date().toISOString()
  };
  const createResp = await api.post('/api/admin/notices', {
    data: noticePayload,
    headers: { cookie: cookieAdmin1 }
  });
  expect(createResp.ok()).toBeTruthy();
  const createBody = await createResp.json();
  expect(createBody.id).toBeTruthy();
  const id = Number(createBody.id);

  // 3. login admin2 and approve (approver1)
  const cookieAdmin2 = await loginGetCookie(ADMIN2.email, ADMIN2.password);
  const approve1 = await api.post('/api/approvals/approve', {
    data: { resourceType: 'notice', resourceId: id, comment: 'approver1 ok' },
    headers: { cookie: cookieAdmin2 }
  });
  expect(approve1.ok()).toBeTruthy();
  const a1 = await approve1.json();
  expect(a1.ok).toBeTruthy();

  // 4. login staff and approve (approver2)
  const cookieStaff = await loginGetCookie(STAFF.email, STAFF.password);
  const approve2 = await api.post('/api/approvals/approve', {
    data: { resourceType: 'notice', resourceId: id, comment: 'approver2 ok' },
    headers: { cookie: cookieStaff }
  });
  expect(approve2.ok()).toBeTruthy();
  const a2 = await approve2.json();
  expect(a2.ok).toBeTruthy();

  // 5. fetch notices and ensure our notice is published
  const noticesResp = await api.get('/api/notices');
  expect(noticesResp.ok()).toBeTruthy();
  const notices = await noticesResp.json();
  const found = (notices.list || []).find((n: any) => Number(n.id) === id);
  expect(found).toBeTruthy();
  expect(found.status).toBe('published');

  await api.dispose();
});

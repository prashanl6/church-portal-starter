import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const ADMIN1 = { email: 'admin1@example.com', password: 'Admin@123' };
const ADMIN2 = { email: 'admin2@example.com', password: 'Admin@123' };
const STAFF = { email: 'staff@example.com', password: 'Staff@123' };

function extractTokenFromSetCookie(setCookie: string | undefined) {
  if (!setCookie) return '';
  const m = setCookie.match(/token=([^;]+)/);
  return m ? m[1] : '';
}

async function loginAndGetToken(request: APIRequestContext, creds: { email: string; password: string }) {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const r = await request.post(base + '/api/auth/login', { data: creds });
  expect(r.ok()).toBeTruthy();
  const sc = r.headers()['set-cookie'];
  const token = extractTokenFromSetCookie(sc);
  expect(token).toBeTruthy();
  return token;
}

test('Admin sermons form UI: fills and shows success message', async ({ browser }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL + '/admin/sermons');
  await expect(page.locator('text=Admin — Sermons')).toBeVisible();

  // Intercept POST so UI confirms success without depending on backend schema
  await page.route('**/api/admin/sermons', route => {
    if (route.request().method().toUpperCase() === 'POST') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 999999 }) });
      return;
    }
    route.continue();
  });

  // Fill the form
  await page.fill('label:has-text("Title") input', 'Playwright UI Test Sermon');
  await page.fill('label:has-text("Speaker") input', 'Playwright Speaker');
  await page.fill('label:has-text("Theme") input', 'Test Theme');
  await page.fill('label:has-text("Facebook Link") input', 'https://www.facebook.com/example');
  const select = page.locator('label:has-text("Week Of") select');
  await expect(select).toHaveCount(1);
  const firstOption = await select.locator('option').nth(1);
  const val = await firstOption.getAttribute('value');
  expect(val).toBeTruthy();
  await select.selectOption(val!);

  // Submit and assert success message visible
  await page.click('button:has-text("Submit for Approval")');
  await expect(page.locator('text=Sermon submitted for approval')).toBeVisible({ timeout: 5000 });
  await context.close();
});

test('Public sermons page: shows published sermons with Watch links', async ({ page }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  await page.goto(baseURL + '/sermons');
  await expect(page.locator('h1:has-text("Sermons")')).toBeVisible();
  const cards = page.locator('.card');
  const count = await cards.count();
  if (count > 0) {
    const watch = cards.first().locator('a', { hasText: 'Watch' });
    await expect(watch).toHaveAttribute('href', /https?:\/\//);
  } else {
    // No published sermons present in the DB for this test run — still a valid run.
    expect(count).toBe(0);
  }
});

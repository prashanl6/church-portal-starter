/**
 * Shared helpers for the test suites (tests/test-plan.api.mjs and tests/full-coverage.api.mjs).
 * Talks to a running local site over HTTP only. Never run against the live site.
 */
import { readFileSync } from 'fs';

export const BASE = process.env.BASE_URL || 'http://localhost:3000';
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  console.error('Refusing to run: this suite creates test data and must only target a local site.');
  process.exit(2);
}
export const FIX = new URL('./fixtures/', import.meta.url);
export const results = [];
let current = null;

/** Start a test case. `roles` says who is exercised, for the printed catalogue. */
export function test(id, title, roles = '') {
  current = { id, title, roles, checks: [] };
  results.push(current);
}
/** Go back to an earlier test case to add more checks to it. */
export function use(id) {
  current = results.find((t) => t.id === id);
}
export function ok(cond, label, extra = '') {
  current.checks.push({ pass: !!cond, label, extra: cond ? '' : extra });
}

export async function call(path, { cookie, method = 'GET', json, form } = {}) {
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

export async function login(email, password) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const m = (res.headers.get('set-cookie') || '').match(/token=[^;]+/);
  return { status: res.status, cookie: m ? m[0] : null, data: await res.json().catch(() => null) };
}

export const file = (name, type) => new Blob([readFileSync(new URL(name, FIX))], { type });
export const j = (x) => String(JSON.stringify(x) ?? x).slice(0, 300);
export const pendingFor = async (cookie, type) =>
  (await call('/api/approvals', { cookie })).data.list.filter((a) => a.status === 'SUBMITTED' && a.resourceType === type);
export const approve = (cookie, approvalId) => call('/api/approvals/approve', { cookie, method: 'POST', json: { approvalId } });
export const reject = (cookie, approvalId, comment) => call('/api/approvals/reject', { cookie, method: 'POST', json: { approvalId, comment } });
export const ymd = (d) => d.toISOString().slice(0, 10);


/** Print every case, write the optional JSON report, and exit non-zero if anything failed. */
export async function finish(order) {
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
}

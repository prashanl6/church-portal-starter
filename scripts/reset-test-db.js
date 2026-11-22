/**
 * Wipes and re-seeds the LOCAL test database so the test suites start clean.
 * Refuses to touch anything that is not on localhost. Used by `npm test`.
 */
require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();
const { execSync } = require('child_process');

const url = process.env.DATABASE_URL || '';
let host = '';
try { host = new URL(url).hostname; } catch {}
if (!['localhost', '127.0.0.1', '[::1]'].includes(host) || process.env.CHURCH_DATABASE_URL) {
  console.error('Refusing to reset: DATABASE_URL is not a local database.');
  process.exit(2);
}
const env = { ...process.env, CHURCH_DATABASE_URL: '' };
const run = (cmd) => execSync(cmd, { stdio: 'pipe', env }).toString();
run('npx prisma migrate reset --force --skip-seed');
run('npm run seed');
run('npm run seed:extra-users');
run('npm run seed:reference');
console.log('[reset-test-db] local test database reset and seeded');

/**
 * Says clearly whether the build can use the database, without revealing the password.
 * Run by scripts/build.js before migrations; also handy on its own:  node scripts/db-check.js
 * Exit code 0 = usable, 1 = not usable.
 *
 * Why: Prisma reports a wrong Neon password as "P1001 Can't reach database server", which
 * looks like a network problem. Neon's own driver returns the real reason.
 */
require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();
const { execSync } = require('child_process');

async function main() {
  const raw = process.env.DATABASE_URL || '';
  let url;
  try {
    url = new URL(raw);
  } catch {
    console.log('[db-check] DATABASE_URL is missing or not a valid URL (check for spaces, quotes or line breaks).');
    return 1;
  }
  const params = [...url.searchParams.keys()].join(', ') || '(none)';
  console.log(`[db-check] host=${url.hostname} database=${url.pathname.slice(1)} password=${url.password ? 'set' : 'missing'} params=${params}`);

  if (/\.neon\.tech$/.test(url.hostname)) {
    try {
      const { neon } = require('@neondatabase/serverless');
      await neon(raw)`SELECT 1`;
      console.log('[db-check] Neon: connected.');
    } catch (e) {
      const msg = String(e.message || e).replace(/postgres(ql)?:\/\/[^\s'"`]+/g, '<url>').slice(0, 300);
      console.log(`[db-check] Neon: ${msg}`);
      if (/password authentication failed/i.test(msg)) {
        console.log('[db-check] → DATABASE_URL has an out-of-date password. Copy the current connection string from Neon (Connect) into Vercel → Settings → Environment Variables → DATABASE_URL, then redeploy.');
      }
      return 1;
    }
  }

  try {
    execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', {
      input: 'SELECT 1;',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    console.log('[db-check] Prisma: connected.');
    return 0;
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`.replace(/postgres(ql)?:\/\/[^\s'"`]+/g, '<url>');
    console.log(`[db-check] Prisma: ${out.split('\n').filter((l) => /Error|P1\d\d\d|reach|auth/i.test(l)).slice(0, 3).join(' | ')}`);
    return 1;
  }
}

main().then((code) => process.exit(code));

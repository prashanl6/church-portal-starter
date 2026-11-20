/**
 * Prints why the build can or cannot reach the database, without revealing the password.
 * Used by scripts/build.js before migrations; also handy on its own:  node scripts/db-check.js
 * Exit code 0 = reachable, 1 = not reachable.
 */
require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();
const dns = require('dns').promises;
const net = require('net');
const { execSync } = require('child_process');

async function main() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) {
    console.log('[db-check] DATABASE_URL is not set.');
    return 1;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    console.log('[db-check] DATABASE_URL is not a valid URL (check for spaces, quotes or line breaks).');
    return 1;
  }
  const port = Number(url.port || 5432);
  const params = [...url.searchParams.keys()].join(', ') || '(none)';
  console.log(`[db-check] host=${url.hostname} port=${port} database=${url.pathname.slice(1)} user=${url.username ? 'set' : 'missing'} password=${url.password ? 'set' : 'missing'} params=${params}`);
  if (/\s|["']/.test(raw)) console.log('[db-check] WARNING: DATABASE_URL contains spaces or quotes.');

  try {
    const addrs = await dns.lookup(url.hostname, { all: true });
    console.log(`[db-check] DNS ok: ${addrs.map((a) => a.address).join(', ')}`);
  } catch (e) {
    console.log(`[db-check] DNS failed: ${e.code || e.message}`);
    return 1;
  }

  const tcp = await new Promise((resolve) => {
    const s = net.connect({ host: url.hostname, port, timeout: 10000 });
    s.on('connect', () => { s.destroy(); resolve('ok'); });
    s.on('timeout', () => { s.destroy(); resolve('timeout'); });
    s.on('error', (e) => resolve(e.code || e.message));
  });
  console.log(`[db-check] TCP ${port}: ${tcp}`);

  const trySelect = (label, dbUrl) => {
    try {
      execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', {
        input: 'SELECT 1;',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000,
        env: { ...process.env, DATABASE_URL: dbUrl },
      });
      console.log(`[db-check] SELECT 1 ok (${label}).`);
      return true;
    } catch (e) {
      const out = `${e.stdout || ''}${e.stderr || ''}`.replace(/postgres(ql)?:\/\/[^\s'"`]+/g, '<url>');
      console.log(`[db-check] SELECT 1 failed (${label}): ${out.trim().split('\n').slice(0, 4).join(' | ')}`);
      return false;
    }
  };
  // Neon's own driver talks to the database over HTTPS (port 443) instead of port 5432.
  if (/\.neon\.tech$/.test(url.hostname)) {
    try {
      const { neon } = require('@neondatabase/serverless');
      const rows = await neon(raw)`SELECT 1 AS ok`;
      console.log(`[db-check] SELECT 1 over HTTPS (Neon driver) ok: ${JSON.stringify(rows)}`);
    } catch (e) {
      console.log(`[db-check] SELECT 1 over HTTPS (Neon driver) failed: ${String(e.message || e).replace(/postgres(ql)?:\/\/[^\s'"`]+/g, '<url>').slice(0, 300)}`);
    }
  }
  if (trySelect('as configured', raw)) return 0;
  if (process.env.DB_CHECK_VARIANTS === '1') {
    const noCb = new URL(raw);
    noCb.searchParams.delete('channel_binding');
    trySelect('without channel_binding', noCb.toString());
    const v4 = (await dns.lookup(url.hostname, { family: 4 })).address;
    const byIp = new URL(noCb.toString());
    const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
    byIp.hostname = v4;
    byIp.searchParams.set('options', `endpoint=${endpoint}`);
    trySelect('IPv4 address + endpoint option', byIp.toString());
    try {
      require('fs').writeFileSync('/etc/gai.conf', 'precedence ::ffff:0:0/96  100\n');
      console.log(`[db-check] wrote /etc/gai.conf (uid ${process.getuid && process.getuid()})`);
      trySelect('hostname with IPv4 preferred', raw);
    } catch (e) {
      console.log(`[db-check] cannot write /etc/gai.conf: ${e.code || e.message}`);
    }
  }
  return 1;
}

main().then((code) => process.exit(code));

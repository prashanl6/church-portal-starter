/**
 * Build entry point used by `npm run build`.
 *
 * Database migrations change the shared database, so they only run for production builds.
 * Vercel preview builds (VERCEL_ENV=preview or development) skip them and just compile,
 * which means a half-finished branch can never alter the live database.
 *
 * Production builds also add any missing reference data (scripts/seed-reference-data.js).
 *
 * Local and non-Vercel builds (no VERCEL_ENV) behave as before and run migrations.
 * Set SKIP_DB_MIGRATIONS=1 to skip them anywhere.
 */
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

/** A sleeping hosted database (e.g. Neon) can take a while to wake, so retry a few times. */
function runWithRetry(cmd, attempts = 4, waitSeconds = 15) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return run(cmd);
    } catch (e) {
      if (i === attempts) throw e;
      console.log(`Attempt ${i} failed; waiting ${waitSeconds}s for the database to wake up…`);
      execSync(`sleep ${waitSeconds}`);
    }
  }
}

const vercelEnv = process.env.VERCEL_ENV;
const skipMigrations =
  process.env.SKIP_DB_MIGRATIONS === '1' || (vercelEnv !== undefined && vercelEnv !== 'production');

// Report whether the database is reachable (never prints the password). Informational only.
try {
  execSync('node scripts/db-check.js', { stdio: 'inherit', env: { ...process.env, DB_CHECK_VARIANTS: process.env.VERCEL_ENV === 'preview' ? '1' : '' } });
} catch {
  console.log('Database check reported a problem (details above).');
}

if (skipMigrations) {
  console.log(
    `Skipping database migrations (${vercelEnv ? `VERCEL_ENV=${vercelEnv}` : 'SKIP_DB_MIGRATIONS=1'}). ` +
      'Only production builds change the database.'
  );
} else {
  runWithRetry('npx prisma migrate deploy');
}

run('npx prisma generate');

if (!skipMigrations) {
  run('node scripts/migrate-legacy-people-event.js');
  // Adds missing reference data (hall rate, process guides, welcome notice); never overwrites.
  run('node scripts/seed-reference-data.js');
}

run('npx next build');

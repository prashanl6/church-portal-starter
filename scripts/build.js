/**
 * Build entry point used by `npm run build`.
 *
 * Database migrations change the shared database, so they only run for production builds.
 * Vercel preview builds (VERCEL_ENV=preview or development) skip them and just compile,
 * which means a half-finished branch can never alter the live database.
 *
 * Local and non-Vercel builds (no VERCEL_ENV) behave as before and run migrations.
 * Set SKIP_DB_MIGRATIONS=1 to skip them anywhere.
 */
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const vercelEnv = process.env.VERCEL_ENV;
const skipMigrations =
  process.env.SKIP_DB_MIGRATIONS === '1' || (vercelEnv !== undefined && vercelEnv !== 'production');

if (skipMigrations) {
  console.log(
    `Skipping database migrations (${vercelEnv ? `VERCEL_ENV=${vercelEnv}` : 'SKIP_DB_MIGRATIONS=1'}). ` +
      'Only production builds change the database.'
  );
} else {
  run('npx prisma migrate deploy');
}

run('npx prisma generate');

if (!skipMigrations) {
  run('node scripts/migrate-legacy-people-event.js');
}

run('npx next build');

/**
 * Picks the database connection string. Shared by the app (src/lib/prisma.ts) and the build
 * scripts, so both always talk to the same database.
 *
 * Order:
 *  1. CHURCH_DATABASE_URL: an explicit override.
 *  2. A database connected through Vercel → Storage (Neon). Vercel names its variables
 *     POSTGRES_PRISMA_URL / POSTGRES_URL, or <PREFIX>_DATABASE_URL / <PREFIX>_POSTGRES_PRISMA_URL
 *     when a custom prefix is chosen because DATABASE_URL already exists.
 *  3. DATABASE_URL.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string | undefined}
 */
function resolveDatabaseUrl(env = process.env) {
  if (env.CHURCH_DATABASE_URL) return env.CHURCH_DATABASE_URL;
  const keys = Object.keys(env).sort();
  const pick = (re) => keys.find((k) => re.test(k) && env[k]);
  const key =
    pick(/^POSTGRES_PRISMA_URL$/) ||
    pick(/^[A-Z0-9]+_POSTGRES_PRISMA_URL$/) ||
    pick(/^[A-Z0-9]+_DATABASE_URL$/) ||
    pick(/^POSTGRES_URL$/);
  return (key && env[key]) || env.DATABASE_URL;
}

/**
 * Direct (non-pooled) connection for migrations, which should not go through a connection
 * pooler. Falls back to the normal one.
 * @param {Record<string, string | undefined>} [env]
 */
function resolveDirectDatabaseUrl(env = process.env) {
  if (env.CHURCH_DATABASE_URL) return env.CHURCH_DATABASE_URL;
  const key = Object.keys(env)
    .sort()
    .find((k) => /^([A-Z0-9]+_)?(DATABASE_URL_UNPOOLED|POSTGRES_URL_NON_POOLING)$/.test(k) && env[k]);
  return (key && env[key]) || resolveDatabaseUrl(env);
}

/** Name of the variable in use, for logs (never the value). */
function databaseUrlSource(env = process.env) {
  if (env.CHURCH_DATABASE_URL) return 'CHURCH_DATABASE_URL';
  const url = resolveDatabaseUrl(env);
  return Object.keys(env).find((k) => env[k] === url && k !== 'DATABASE_URL') || 'DATABASE_URL';
}

module.exports = { resolveDatabaseUrl, resolveDirectDatabaseUrl, databaseUrlSource };

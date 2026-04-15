/**
 * One-way copy: local SQLite (legacy dev.db) → PostgreSQL pointed at by DATABASE_URL.
 *
 * Wipes matching tables in Postgres, then inserts all rows from SQLite, resets id sequences.
 *
 * Usage (from repo root):
 *   CONFIRM_IMPORT=1 npm run db:import-sqlite
 *
 * Optional:
 *   SQLITE_PATH=./prisma/dev.db
 *   DATABASE_URL=postgresql://...   (or set in .env — last DATABASE_URL wins if duplicated)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const DEFAULT_SQLITE = path.join(ROOT, 'prisma', 'dev.db');

const TABLE_ORDER = [
  'User',
  'Asset',
  'ChurchIndividual',
  'WeddingAnniversary',
  'Notice',
  'Sermon',
  'SermonRating',
  'ProcessDoc',
  'ProcessAttachment',
  'Booking',
  'HallBookingSettings',
  'ChurchBankAccount',
  'ChurchBankAccountProposal',
  'MedicalItem',
  'MedicalLoan',
  'Upload',
  'Approval',
  'AuditLog',
];

function loadDatabaseUrlFromEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, 'utf8');
  const matches = [...text.matchAll(/^DATABASE_URL\s*=\s*(.+)$/gm)];
  if (!matches.length) return null;
  let raw = matches[matches.length - 1][1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw;
}

function normalizeValue(pgType, v) {
  if (v == null) return null;
  if (pgType === 'boolean') {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  }
  return v;
}

async function main() {
  if (process.env.CONFIRM_IMPORT !== '1') {
    console.error('Refusing to run: this TRUNCATES app tables in PostgreSQL.');
    console.error('Run: CONFIRM_IMPORT=1 npm run db:import-sqlite');
    process.exit(1);
  }

  let databaseUrl = process.env.DATABASE_URL || loadDatabaseUrlFromEnvFile();
  if (!databaseUrl || (!databaseUrl.startsWith('postgresql:') && !databaseUrl.startsWith('postgres:'))) {
    console.error('Need DATABASE_URL=postgresql://... (or a single postgres URL in .env)');
    process.exit(1);
  }

  const sqlitePath = process.env.SQLITE_PATH ? path.resolve(ROOT, process.env.SQLITE_PATH) : DEFAULT_SQLITE;
  if (!fs.existsSync(sqlitePath)) {
    console.error('SQLite file not found:', sqlitePath);
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const sqliteTables = new Set(
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name)
  );

  const tables = TABLE_ORDER.filter((t) => sqliteTables.has(t));
  if (!tables.length) {
    console.error('No known app tables found in SQLite.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    for (const t of tables) {
      const { rows } = await client.query(
        `SELECT to_regclass($1) AS reg`,
        [`public."${t}"`]
      );
      if (!rows[0].reg) {
        throw new Error(`Postgres table missing: "${t}". Run: npx prisma migrate deploy`);
      }
    }

    const list = tables.map((t) => `"${t}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

    for (const t of tables) {
      const cols = sqlite.prepare(`PRAGMA table_info("${t}")`).all().map((c) => c.name);
      if (!cols.length) continue;

      const rows = sqlite.prepare(`SELECT * FROM "${t}"`).all();
      if (!rows.length) {
        console.log(`- ${t}: 0 rows`);
        continue;
      }

      const { rows: typeRows } = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [t]
      );
      const types = Object.fromEntries(typeRows.map((r) => [r.column_name, r.data_type]));

      const colSql = cols.map((c) => `"${c}"`).join(', ');
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const insertSql = `INSERT INTO "${t}" (${colSql}) VALUES (${placeholders})`;

      for (const r of rows) {
        const vals = cols.map((c) => normalizeValue(types[c], r[c]));
        await client.query(insertSql, vals);
      }
      console.log(`- ${t}: ${rows.length} rows`);
    }

    for (const t of tables) {
      let seq = null;
      for (const candidate of [`public."${t}"`, `"${t}"`, t]) {
        const { rows: sr } = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [candidate]);
        if (sr[0]?.seq) {
          seq = sr[0].seq;
          break;
        }
      }
      if (!seq) continue;
      await client.query(`SELECT setval($1::regclass, COALESCE((SELECT MAX("id") FROM "${t}"), 1), true)`, [seq]);
    }

    await client.query('COMMIT');

    console.log('\nDone. PostgreSQL now matches SQLite data from:', sqlitePath);
    console.log('Run: npm run dev');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
    sqlite.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

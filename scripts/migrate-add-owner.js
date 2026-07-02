// Migration: add per-user ownership for multi-tenant data isolation.
// - Adds owner_email to the five top-level tables
// - Backfills existing rows to the admin owner
// - Relaxes global UNIQUE constraints to be per-owner
// Safe to run multiple times (idempotent).

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const ADMIN_OWNER =
  (process.env.ADMIN_EMAILS || 'hafizatulamani02@gmail.com')
    .split(',')[0]
    .trim()
    .toLowerCase();

const OWNED_TABLES = ['classes', 'teachers', 'subjects', 'students', 'assessments'];

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected. Admin owner =', ADMIN_OWNER);

  try {
    await client.query('BEGIN');

    // 1. Add owner_email columns
    for (const table of OWNED_TABLES) {
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS owner_email TEXT`
      );
    }

    // 2. Backfill existing rows to the admin owner
    for (const table of OWNED_TABLES) {
      const res = await client.query(
        `UPDATE ${table} SET owner_email = $1 WHERE owner_email IS NULL`,
        [ADMIN_OWNER]
      );
      console.log(`  ${table}: backfilled ${res.rowCount} row(s)`);
    }

    // 3. Drop the old global UNIQUE constraints that break multi-tenancy
    const dropConstraints = [
      ['classes', 'classes_name_key'],
      ['teachers', 'teachers_name_key'],
      ['teachers', 'teachers_email_key'],
      ['subjects', 'subjects_name_key'],
    ];
    for (const [table, name] of dropConstraints) {
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
    }

    // 4. Add per-owner UNIQUE constraints (drop-then-add for idempotency)
    const ownerUniques = [
      ['classes', 'classes_owner_name_key', '(owner_email, name)'],
      ['teachers', 'teachers_owner_name_key', '(owner_email, name)'],
      ['subjects', 'subjects_owner_name_key', '(owner_email, name)'],
    ];
    for (const [table, name, cols] of ownerUniques) {
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name}`);
      await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE ${cols}`);
    }

    // 5. Indexes for owner-scoped lookups
    for (const table of OWNED_TABLES) {
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_owner ON ${table}(owner_email)`
      );
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();

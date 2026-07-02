// Migration: SaaS account + subscription layer.
// - Creates `accounts` (the whitelist / subscription registry) and `payments`
//   (manual DuitNow receipt submissions awaiting approval).
// - Seeds the superadmin and grandfathers existing whitelisted emails with an
//   unlimited subscription so nobody is locked out during the cutover.
// Idempotent: safe to run multiple times.
//
//   node scripts/migrate-saas.js

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const SUPERADMIN = 'muhammadnadzmil@gmail.com';
// Existing users to grandfather in with an unlimited subscription.
const UNLIMITED_USERS = ['hafizatulamani02@gmail.com'];
// Any additional legacy whitelist emails become active users (unlimited too,
// so the cutover doesn't kick anyone out). Pulled from the old env var.
const LEGACY_ALLOWED = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .filter((e) => e !== SUPERADMIN);

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected.');

  try {
    await client.query('BEGIN');

    // accounts: one row per customer/user of the SaaS.
    //  role:   'superadmin' (platform owner) | 'user' (tenant/teacher)
    //  status: 'active' | 'inactive'
    //  subscription_expires_at: NULL = unlimited; otherwise access ends at that time
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        email TEXT PRIMARY KEY,
        full_name TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin','user')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
        subscription_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // payments: manual DuitNow submissions. A superadmin approves/rejects each.
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
        months INTEGER NOT NULL DEFAULT 1,
        reference TEXT,
        receipt_data TEXT,       -- data URL (base64) of the uploaded receipt image
        receipt_mime TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        note TEXT,
        reviewed_by TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email)`
    );

    // Seed superadmin (unlimited).
    await client.query(
      `INSERT INTO accounts (email, full_name, role, status, subscription_expires_at)
       VALUES ($1, 'Super Admin', 'superadmin', 'active', NULL)
       ON CONFLICT (email) DO UPDATE
         SET role = 'superadmin', status = 'active',
             subscription_expires_at = NULL, updated_at = NOW()`,
      [SUPERADMIN]
    );
    console.log('  seeded superadmin:', SUPERADMIN);

    // Seed unlimited grandfathered users (e.g. the current data owner).
    for (const email of UNLIMITED_USERS) {
      await client.query(
        `INSERT INTO accounts (email, role, status, subscription_expires_at)
         VALUES ($1, 'user', 'active', NULL)
         ON CONFLICT (email) DO UPDATE
           SET status = 'active', subscription_expires_at = NULL, updated_at = NOW()`,
        [email.toLowerCase()]
      );
      console.log('  seeded unlimited user:', email);
    }

    // Grandfather any other legacy whitelist emails as active users (unlimited),
    // but never downgrade an existing superadmin/subscription.
    for (const email of LEGACY_ALLOWED) {
      if (UNLIMITED_USERS.includes(email)) continue;
      await client.query(
        `INSERT INTO accounts (email, role, status, subscription_expires_at)
         VALUES ($1, 'user', 'active', NULL)
         ON CONFLICT (email) DO NOTHING`,
        [email]
      );
      console.log('  grandfathered legacy user:', email);
    }

    await client.query('COMMIT');
    console.log('\n✅ SaaS migration completed.');

    const { rows } = await client.query(
      `SELECT email, role, status, subscription_expires_at FROM accounts ORDER BY role, email`
    );
    console.table(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();

// Migration: add a marker so the expiry cron never emails the same lapsed
// account twice. Cleared again whenever the subscription is renewed.
// Idempotent.
//
//   node scripts/migrate-email-notify.js

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(
      `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ended_notified_at TIMESTAMPTZ`
    );
    console.log('✅ accounts.ended_notified_at ready.');
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendSubscriptionEnded } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Daily job: find subscriptions that have just lapsed, email the customer once,
// and deactivate the account. Idempotent via accounts.ended_notified_at.
//
// Protect with CRON_SECRET. Call it as either:
//   GET /api/cron/subscription-expiry?secret=YOUR_SECRET
//   GET /api/cron/subscription-expiry   with header  Authorization: Bearer YOUR_SECRET
//
// Schedule daily with Vercel Cron (vercel.json), a host cron, or any scheduler.
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const provided =
    searchParams.get('secret') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!secret || provided !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Lapsed = has an expiry, it's in the past, and we haven't emailed yet.
  const lapsed = await query(
    `SELECT email, full_name FROM accounts
     WHERE role <> 'superadmin'
       AND subscription_expires_at IS NOT NULL
       AND subscription_expires_at <= NOW()
       AND ended_notified_at IS NULL`
  );

  let notified = 0;
  for (const acc of lapsed.rows) {
    await sendSubscriptionEnded(acc.email, acc.full_name);
    await query(
      `UPDATE accounts SET status = 'inactive', ended_notified_at = NOW(), updated_at = NOW()
       WHERE email = $1`,
      [acc.email]
    );
    notified++;
  }

  return NextResponse.json({ success: true, checked: lapsed.rows.length, notified });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

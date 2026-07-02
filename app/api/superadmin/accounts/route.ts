import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperadmin } from '@/lib/auth';
import { sendSubscriptionStarted } from '@/lib/email';

export const dynamic = 'force-dynamic';

// List every account with a computed "active now" flag (respects expiry).
export async function GET() {
  const admin = await requireSuperadmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const res = await query(
    `SELECT email, full_name, phone, role, status, subscription_expires_at, created_at, updated_at,
            (role = 'superadmin'
             OR (status = 'active'
                 AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW()))) AS active_now
     FROM accounts
     ORDER BY (role = 'superadmin') DESC, created_at DESC`
  );
  return NextResponse.json({ success: true, data: res.rows });
}

// Update an account. Supported operations (any combination):
//   status: 'active' | 'inactive'
//   unlimited: true                      -> subscription never expires
//   extendMonths: N                      -> add N months from later of now/current expiry
//   expiresAt: ISO string | null         -> set an explicit expiry
export async function PATCH(request: Request) {
  const admin = await requireSuperadmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ success: false, error: 'Email diperlukan' }, { status: 400 });

    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (body.status === 'active' || body.status === 'inactive') {
      sets.push(`status = $${i++}`);
      params.push(body.status);
    }
    if (body.unlimited === true) {
      sets.push(`subscription_expires_at = NULL`);
    } else if (typeof body.extendMonths === 'number' && body.extendMonths > 0) {
      sets.push(
        `subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + ($${i++} || ' months')::interval`
      );
      params.push(String(Math.floor(body.extendMonths)));
    } else if (body.expiresAt === null) {
      sets.push(`subscription_expires_at = NULL`);
    } else if (typeof body.expiresAt === 'string' && body.expiresAt) {
      sets.push(`subscription_expires_at = $${i++}`);
      params.push(body.expiresAt);
    }

    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: 'Tiada perubahan' }, { status: 400 });
    }

    // A "grant" means access is being (re)activated: activation, unlimited, or
    // added months. On a grant, reset the expiry-notified marker so a future
    // lapse triggers a fresh "ended" email, and notify the customer.
    const isGrant =
      body.status === 'active' ||
      body.unlimited === true ||
      (typeof body.extendMonths === 'number' && body.extendMonths > 0);
    if (isGrant) {
      sets.push(`ended_notified_at = NULL`);
    }

    sets.push(`updated_at = NOW()`);
    params.push(email);
    const res = await query(
      `UPDATE accounts SET ${sets.join(', ')} WHERE email = $${i} RETURNING *`,
      params
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Akaun tidak dijumpai' }, { status: 404 });
    }

    const account = res.rows[0];
    let emailed = false;
    if (isGrant && account.status === 'active' && account.role !== 'superadmin') {
      emailed = await sendSubscriptionStarted(
        account.email,
        account.full_name,
        account.subscription_expires_at
      );
    }
    return NextResponse.json({ success: true, data: account, emailed });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ success: false, error: 'Gagal kemaskini akaun' }, { status: 500 });
  }
}

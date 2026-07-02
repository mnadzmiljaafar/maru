import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperadmin } from '@/lib/auth';
import { extendSubscription } from '@/lib/accounts';
import { sendSubscriptionStarted } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Return a single payment including the receipt image (data URL), so the
// superadmin can view proof before approving.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperadmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const res = await query(`SELECT * FROM payments WHERE id = $1`, [params.id]);
  if (res.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Tidak dijumpai' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: res.rows[0] });
}

// Approve or reject a payment.
//   { action: 'approve', months?: number }  -> extend subscription + activate
//   { action: 'reject', note?: string }     -> mark rejected (no access granted)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperadmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const action = body.action;

    const pay = await query(`SELECT * FROM payments WHERE id = $1`, [params.id]);
    if (pay.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak dijumpai' }, { status: 404 });
    }
    const payment = pay.rows[0];

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Bayaran ini sudah ${payment.status}.` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const months = Math.max(1, Math.min(12, parseInt(body.months, 10) || payment.months || 1));
      // Grant access: extend/activate the account, then mark the payment approved.
      const acc = await extendSubscription(payment.email, months);
      await query(
        `UPDATE payments SET status = 'approved', months = $1, note = $2,
            reviewed_by = $3, reviewed_at = NOW() WHERE id = $4`,
        [months, body.note || null, admin.email, params.id]
      );
      // Notify the customer their subscription is now active. Non-blocking:
      // email failure must not fail the approval.
      const emailed = await sendSubscriptionStarted(
        payment.email,
        payment.full_name || acc?.full_name || null,
        acc?.subscription_expires_at || null
      );
      return NextResponse.json({ success: true, data: { account: acc, emailed } });
    }

    if (action === 'reject') {
      await query(
        `UPDATE payments SET status = 'rejected', note = $1,
            reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
        [body.note || null, admin.email, params.id]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Tindakan tidak sah' }, { status: 400 });
  } catch (error) {
    console.error('Error reviewing payment:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses' }, { status: 500 });
  }
}

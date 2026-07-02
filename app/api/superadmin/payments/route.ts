import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperadmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// List payment submissions, newest first. Optional ?status=pending|approved|rejected.
// The heavy receipt_data blob is excluded here; fetch it per-row when viewing.
export async function GET(request: Request) {
  const admin = await requireSuperadmin();
  if (!admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const params: any[] = [];
  let where = '';
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    where = 'WHERE status = $1';
    params.push(status);
  }

  const res = await query(
    `SELECT id, email, full_name, phone, amount, months, reference,
            (receipt_data IS NOT NULL) AS has_receipt, receipt_mime,
            status, note, reviewed_by, reviewed_at, created_at
     FROM payments ${where}
     ORDER BY created_at DESC`,
    params
  );
  return NextResponse.json({ success: true, data: res.rows });
}

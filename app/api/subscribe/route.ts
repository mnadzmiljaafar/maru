import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PRICE_PER_MONTH = 10; // RM
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024; // ~4MB data URL cap

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Public endpoint — a prospective customer submits proof of a DuitNow payment.
// This creates a PENDING payment record for a superadmin to approve. It never
// grants access on its own; approval happens in the superadmin console.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || '').trim();
    const phone = String(body.phone || '').trim();
    const reference = String(body.reference || '').trim();
    const receipt: string | undefined = body.receipt; // data URL
    const receiptMime = String(body.receipt_mime || '').trim() || null;
    const months = Math.max(1, Math.min(12, parseInt(body.months, 10) || 1));

    if (!isEmail(email)) {
      return NextResponse.json({ success: false, error: 'Sila masukkan email yang sah.' }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ success: false, error: 'Sila masukkan nama penuh.' }, { status: 400 });
    }
    if (!reference && !receipt) {
      return NextResponse.json(
        { success: false, error: 'Sila muat naik resit atau masukkan nombor rujukan bayaran.' },
        { status: 400 }
      );
    }
    if (receipt && receipt.length > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Saiz resit terlalu besar (maksimum 3MB).' },
        { status: 400 }
      );
    }

    const amount = PRICE_PER_MONTH * months;

    await query(
      `INSERT INTO payments (email, full_name, phone, amount, months, reference, receipt_data, receipt_mime, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [email, fullName, phone || null, amount, months, reference || null, receipt || null, receiptMime]
    );

    // Register the prospective customer as an inactive account so they appear in
    // the superadmin list even before approval. Never downgrades an existing one.
    await query(
      `INSERT INTO accounts (email, full_name, phone, role, status)
       VALUES ($1, $2, $3, 'user', 'inactive')
       ON CONFLICT (email) DO UPDATE SET
         full_name = COALESCE(NULLIF(accounts.full_name, ''), EXCLUDED.full_name),
         phone = COALESCE(NULLIF(accounts.phone, ''), EXCLUDED.phone),
         updated_at = NOW()`,
      [email, fullName, phone || null]
    );

    return NextResponse.json({
      success: true,
      message:
        'Terima kasih! Bayaran anda sedang disemak. Akaun akan diaktifkan sebaik sahaja disahkan (biasanya dalam masa 24 jam).',
    });
  } catch (error) {
    console.error('Error submitting subscription:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghantar. Sila cuba lagi.' }, { status: 500 });
  }
}

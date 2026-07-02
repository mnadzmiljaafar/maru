// Email notifications sent FROM the superadmin's Gmail account via SMTP.
//
// Setup (one-time):
//   1. Enable 2-Step Verification on the Gmail account.
//   2. Create an App Password: https://myaccount.google.com/apppasswords
//   3. Put these in .env.local (and your host's env):
//        SMTP_USER=muhammadnadzmil@gmail.com
//        SMTP_PASS=<the 16-char app password, no spaces>
//        SMTP_FROM_NAME=Sistem Penilaian Murid   (optional display name)
//
// If SMTP is not configured, these helpers no-op (and log) so that approving a
// payment never fails just because email is unavailable.

import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Sistem Penilaian Murid';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
// Where new-payment alerts go. Defaults to the sending account (yourself).
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || SMTP_USER;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP not configured — skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

function fmt(dateIso: string | null): string {
  if (!dateIso) return 'tanpa had';
  return new Date(dateIso).toLocaleDateString('ms-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function shell(title: string, body: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
    <div style="background:linear-gradient(120deg,#4f46e5,#6366f1);padding:24px;border-radius:14px 14px 0 0;color:#fff">
      <h2 style="margin:0;font-size:20px">${title}</h2>
    </div>
    <div style="border:1px solid #eef1f6;border-top:none;border-radius:0 0 14px 14px;padding:24px;line-height:1.6">
      ${body}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Sistem Pengurusan Penilaian Murid · SK Taman Jasmin
    </p>
  </div>`;
}

// Sent when a subscription is activated/renewed (payment approved or manual grant).
export async function sendSubscriptionStarted(
  to: string,
  name: string | null,
  expiresAt: string | null
): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const validity = expiresAt
    ? `Langganan anda sah sehingga <strong>${fmt(expiresAt)}</strong>.`
    : `Langganan anda kini <strong>tanpa had</strong>.`;
  return send(
    to,
    '✅ Langganan Anda Telah Diaktifkan',
    shell(
      'Langganan Diaktifkan',
      `<p>${greeting}</p>
       <p>Terima kasih! Akaun anda telah <strong>diaktifkan</strong>. ${validity}</p>
       <p>Anda kini boleh log masuk dan mula menggunakan sistem:</p>
       <p><a href="${APP_URL}/login"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">
             Log Masuk Sekarang</a></p>
       <p style="color:#64748b;font-size:13px">Gunakan email Google ini (<strong>${to}</strong>) untuk log masuk.</p>`
    )
  );
}

// Sent by the expiry cron when a subscription lapses.
export async function sendSubscriptionEnded(
  to: string,
  name: string | null
): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return send(
    to,
    '⏰ Langganan Anda Telah Tamat',
    shell(
      'Langganan Tamat',
      `<p>${greeting}</p>
       <p>Langganan anda telah <strong>tamat tempoh</strong>. Akses ke sistem kini digantung.</p>
       <p>Untuk menyambung semula dan mengakses data anda, sila perbaharui langganan (RM10/bulan):</p>
       <p><a href="${APP_URL}/subscribe"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">
             Perbaharui Langganan</a></p>
       <p style="color:#64748b;font-size:13px">Data anda kekal selamat dan akan kembali sebaik sahaja langganan diaktifkan semula.</p>`
    )
  );
}

// Sent to YOU (the superadmin) when a new subscriber submits a payment, so you
// know there's something to review/approve in the superadmin console.
export async function sendNewPaymentAdminAlert(payment: {
  email: string;
  full_name?: string | null;
  phone?: string | null;
  amount: number | string;
  months: number;
  reference?: string | null;
}): Promise<boolean> {
  if (!ADMIN_NOTIFY_EMAIL) return false;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 10px;color:#64748b">${label}</td>
         <td style="padding:6px 10px;font-weight:600">${value || '—'}</td></tr>`;
  return send(
    ADMIN_NOTIFY_EMAIL,
    `💳 Bayaran Langganan Baharu — ${payment.full_name || payment.email}`,
    shell(
      'Bayaran Langganan Baharu',
      `<p>Seorang pengguna baharu telah menghantar bayaran dan sedang menunggu pengesahan anda.</p>
       <table style="border-collapse:collapse;margin:10px 0;font-size:14px">
         ${row('Nama', payment.full_name || '')}
         ${row('Email', payment.email)}
         ${row('Telefon', payment.phone || '')}
         ${row('Jumlah', `RM${Number(payment.amount).toFixed(2)} (${payment.months} bulan)`)}
         ${row('Rujukan', payment.reference || '')}
       </table>
       <p><a href="${APP_URL}/superadmin"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">
             Semak &amp; Luluskan</a></p>`
    )
  );
}

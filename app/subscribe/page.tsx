'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Payment details are configurable via env so you can point the QR at your own
// bank without touching code. Drop your DuitNow QR image at public/duitnow-qr.png.
const QR_IMAGE = process.env.NEXT_PUBLIC_DUITNOW_QR || '/duitnow-qr.png';
const PAYEE_NAME = process.env.NEXT_PUBLIC_DUITNOW_NAME || 'Muhammad Nadzmil';
const BANK_NAME = process.env.NEXT_PUBLIC_DUITNOW_BANK || '';
const ACCOUNT_NO = process.env.NEXT_PUBLIC_DUITNOW_ACCOUNT || '';
// Early-access promo: RM10 grants 3 months (normal price RM10/month).
const PRICE = 10;
const PROMO_MONTHS = 3;

export default function SubscribePage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', reference: '' });
  const [receipt, setReceipt] = useState<{ data: string; mime: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    setError(null);
    if (!file) { setReceipt(null); return; }
    if (file.size > 3 * 1024 * 1024) {
      setError('Saiz fail terlalu besar (maksimum 3MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReceipt({ data: reader.result as string, mime: file.type, name: file.name });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Sila lengkapkan nama dan email.');
      return;
    }
    if (!receipt && !form.reference.trim()) {
      setError('Sila muat naik resit atau masukkan nombor rujukan bayaran.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          months: PROMO_MONTHS,
          receipt: receipt?.data,
          receipt_mime: receipt?.mime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(data.message);
      } else {
        setError(data.error || 'Gagal menghantar.');
      }
    } catch (e) {
      setError('Gagal menghantar. Sila cuba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="subscribe">
      <header className="top">
        <button className="back" onClick={() => router.push('/')}>← Kembali</button>
        <div className="brand">
          <img src="/logo.png" alt="Logo" />
          <span>Langganan · SK Taman Jasmin</span>
        </div>
      </header>

      {done ? (
        <div className="card success-card">
          <div className="check">✅</div>
          <h1>Permohonan Diterima!</h1>
          <p>{done}</p>
          <button className="cta" onClick={() => router.push('/login')}>Ke Halaman Log Masuk</button>
        </div>
      ) : (
        <div className="grid">
          <div className="card pay-card">
            <div className="promo-pill">🎉 Akses Awal · RM{PRICE} untuk {PROMO_MONTHS} bulan</div>
            <h2>1. Bayar RM{PRICE}</h2>
            <p className="muted">
              Harga biasa <s>RM{PRICE}/bulan</s> — kini dapatkan <strong>{PROMO_MONTHS} bulan penuh</strong> dengan
              satu bayaran RM{PRICE}. Imbas kod DuitNow QR di bawah menggunakan aplikasi perbankan atau e-dompet anda.
            </p>
            <div className="qr-wrap">
              <img
                src={QR_IMAGE}
                alt="DuitNow QR"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="pay-details">
              <div><span>Penerima</span><strong>{PAYEE_NAME}</strong></div>
              {BANK_NAME && <div><span>Bank</span><strong>{BANK_NAME}</strong></div>}
              {ACCOUNT_NO && <div><span>No. Akaun</span><strong>{ACCOUNT_NO}</strong></div>}
              <div><span>Jumlah</span><strong>RM{PRICE}.00</strong></div>
            </div>
            <p className="note">DuitNow QR menyokong semua bank Malaysia &amp; e-dompet (TNG, GrabPay, dll).</p>
          </div>

          <div className="card form-card">
            <h2>2. Sahkan Bayaran</h2>
            <p className="muted">Muat naik resit &amp; masukkan email Google yang akan anda gunakan untuk log masuk.</p>

            <label>Nama Penuh *</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama anda" />

            <label>Email Google *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@gmail.com" />

            <label>No. Telefon</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0123456789" />

            <label>No. Rujukan Bayaran</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Cth: nombor rujukan DuitNow" />

            <label>Muat Naik Resit (gambar)</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            {receipt && <div className="file-ok">📎 {receipt.name}</div>}

            {error && <div className="err">{error}</div>}

            <button className="cta full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menghantar...' : 'Hantar untuk Pengesahan'}
            </button>
            <p className="note">Akaun anda akan diaktifkan selepas bayaran disahkan (biasanya dalam 24 jam).</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscribe {
          min-height: 100vh;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(180deg, #eef2ff, #f8fafc);
          color: #1e293b;
          padding-bottom: 60px;
        }
        .top { display: flex; align-items: center; gap: 18px; padding: 16px 6vw; }
        .back { background: none; border: none; cursor: pointer; font-weight: 600; color: #475569; font-size: 15px; font-family: inherit; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand img { width: 34px; height: 34px; object-fit: contain; }
        .brand span { font-weight: 700; color: #334155; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; max-width: 940px; margin: 20px auto; padding: 0 6vw; }
        .card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 14px 40px rgba(79,70,229,0.10); border: 1px solid #e7eaf6; }
        .card h2 { margin: 0 0 6px; font-size: 20px; }
        .promo-pill {
          display: inline-block; background: linear-gradient(120deg, #f59e0b, #f97316); color: #fff;
          padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; margin-bottom: 12px;
        }
        .muted s { color: #cbd5e1; }
        .muted { color: #64748b; font-size: 14px; margin: 0 0 18px; line-height: 1.5; }
        .qr-wrap {
          display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 2px dashed #c7cef0; border-radius: 16px;
          min-height: 240px; padding: 16px; margin-bottom: 18px;
        }
        .qr-wrap img { max-width: 100%; max-height: 260px; border-radius: 8px; }
        .pay-details { display: flex; flex-direction: column; gap: 10px; }
        .pay-details div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eef1f6; }
        .pay-details span { color: #64748b; font-size: 14px; }
        .note { font-size: 12.5px; color: #94a3b8; margin: 14px 0 0; line-height: 1.5; }
        .form-card label { display: block; font-weight: 600; font-size: 13.5px; margin: 14px 0 6px; color: #334155; }
        .form-card input {
          width: 100%; padding: 11px 13px; border: 1.5px solid #e3e7f1; border-radius: 10px;
          font-size: 15px; font-family: inherit; box-sizing: border-box;
        }
        .form-card input:focus { outline: none; border-color: #6366f1; }
        .file-ok { margin-top: 8px; font-size: 13px; color: #059669; }
        .err { margin-top: 14px; padding: 10px 12px; background: #fff1f2; color: #e11d48; border-radius: 10px; font-size: 14px; border-left: 4px solid #f43f5e; }
        .cta {
          background: linear-gradient(120deg, #4f46e5, #6366f1); color: white; border: none;
          border-radius: 11px; padding: 14px 22px; font-weight: 700; font-size: 16px; cursor: pointer;
          font-family: inherit; margin-top: 20px; box-shadow: 0 10px 24px rgba(79,70,229,0.25);
        }
        .cta:hover:not(:disabled) { transform: translateY(-1px); }
        .cta:disabled { opacity: 0.7; cursor: not-allowed; }
        .cta.full { width: 100%; }
        .success-card { max-width: 480px; margin: 60px auto; text-align: center; }
        .success-card .check { font-size: 54px; margin-bottom: 10px; }
        .success-card h1 { margin: 0 0 12px; }
        .success-card p { color: #475569; line-height: 1.6; }
      `}</style>
    </div>
  );
}

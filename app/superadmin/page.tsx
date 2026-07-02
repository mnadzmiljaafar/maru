'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import '../globals.css';

interface Account {
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'superadmin' | 'user';
  status: 'active' | 'inactive';
  subscription_expires_at: string | null;
  created_at: string;
  active_now: boolean;
}

interface Payment {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  amount: string;
  months: number;
  reference: string | null;
  has_receipt: boolean;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function fmtDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('ms-MY', { year: 'numeric', month: 'short', day: 'numeric' });
}

function subLabel(a: Account) {
  if (a.role === 'superadmin') return 'Superadmin';
  if (a.subscription_expires_at === null && a.status === 'active') return 'Tanpa had';
  if (a.subscription_expires_at) return `Sehingga ${fmtDate(a.subscription_expires_at)}`;
  return '—';
}

export default function SuperadminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'payments' | 'accounts'>('payments');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; src: string | null; loading: boolean }>({ open: false, src: null, loading: false });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/superadmin/me');
        const data = await res.json();
        if (data.success && data.data.isSuperadmin) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (authorized) { loadAccounts(); loadPayments(); }
  }, [authorized]);

  const loadAccounts = async () => {
    const res = await fetch('/api/superadmin/accounts');
    const data = await res.json();
    if (data.success) setAccounts(data.data);
  };
  const loadPayments = async () => {
    const res = await fetch('/api/superadmin/payments');
    const data = await res.json();
    if (data.success) setPayments(data.data);
  };

  const reviewPayment = async (id: number, action: 'approve' | 'reject', months?: number) => {
    if (action === 'reject' && !confirm('Tolak bayaran ini?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/superadmin/payments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, months }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadPayments(), loadAccounts()]);
      } else {
        alert(data.error || 'Gagal');
      }
    } finally {
      setBusy(false);
    }
  };

  const viewReceipt = async (id: number) => {
    setReceiptModal({ open: true, src: null, loading: true });
    const res = await fetch(`/api/superadmin/payments/${id}`);
    const data = await res.json();
    setReceiptModal({ open: true, src: data.success ? data.data.receipt_data : null, loading: false });
  };

  const updateAccount = async (email: string, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch('/api/superadmin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...patch }),
      });
      const data = await res.json();
      if (data.success) await loadAccounts();
      else alert(data.error || 'Gagal');
    } finally {
      setBusy(false);
    }
  };

  if (authorized === null) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Memuatkan…</div>;
  }
  if (authorized === false) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>⛔ Akses Ditolak</h1>
        <p>Hanya superadmin boleh mengakses halaman ini.</p>
        <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>← Ke Dashboard</button>
      </div>
    );
  }

  const pending = payments.filter((p) => p.status === 'pending');
  const activeCount = accounts.filter((a) => a.active_now).length;
  const inactiveCount = accounts.filter((a) => !a.active_now).length;

  return (
    <div className="app-container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: 70, height: 70, objectFit: 'contain' }} />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 .25rem' }}>
              🛡️ Superadmin
            </h2>
            <h1 style={{ fontSize: '1.1rem' }}>Pengurusan Pengguna &amp; Langganan</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>← Dashboard</button>
          <button className="btn btn-outline" onClick={() => signOut({ callbackUrl: '/login' })}>🚪 Keluar</button>
        </div>

        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 16 }}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 13 }}>Jumlah Pengguna</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{accounts.length}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg,#43e97b,#38f9d7)', color: '#fff', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 13 }}>Aktif</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{activeCount}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)', color: '#fff', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 13 }}>Tidak Aktif</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{inactiveCount}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg,#4facfe,#00f2fe)', color: '#fff', padding: 16, borderRadius: 10 }}>
            <div style={{ fontSize: 13 }}>Bayaran Menunggu</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{pending.length}</div>
          </div>
        </div>

        <div className="nav-tabs" style={{ marginTop: 16 }}>
          <button className={`nav-tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>
            💳 Bayaran {pending.length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 12, marginLeft: 6 }}>{pending.length}</span>}
          </button>
          <button className={`nav-tab ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>
            👥 Pengguna
          </button>
        </div>
      </div>

      <div className="main-content">
        {tab === 'payments' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="students-table">
              <thead>
                <tr>
                  <th>TARIKH</th><th>NAMA / EMAIL</th><th>JUMLAH</th><th>RUJUKAN</th><th>RESIT</th><th>STATUS</th><th>TINDAKAN</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.created_at)}</td>
                    <td>
                      <strong>{p.full_name || '—'}</strong><br />
                      <span style={{ fontSize: 12, color: '#64748b' }}>{p.email}</span>
                      {p.phone && <><br /><span style={{ fontSize: 12, color: '#64748b' }}>📞 {p.phone}</span></>}
                    </td>
                    <td>RM{Number(p.amount).toFixed(2)}<br /><span style={{ fontSize: 12, color: '#64748b' }}>{p.months} bulan</span></td>
                    <td style={{ fontSize: 13 }}>{p.reference || '—'}</td>
                    <td>{p.has_receipt ? <button className="btn btn-sm btn-outline" onClick={() => viewReceipt(p.id)}>🖼️ Lihat</button> : '—'}</td>
                    <td>
                      <span className={`badge-${p.status}`} style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                        background: p.status === 'pending' ? '#fef3c7' : p.status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: p.status === 'pending' ? '#92400e' : p.status === 'approved' ? '#166534' : '#991b1b',
                      }}>
                        {p.status === 'pending' ? 'Menunggu' : p.status === 'approved' ? 'Diluluskan' : 'Ditolak'}
                      </span>
                    </td>
                    <td>
                      {p.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => reviewPayment(p.id, 'approve', p.months)}>✅ Lulus</button>
                          <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => reviewPayment(p.id, 'reject')}>✕ Tolak</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#64748b' }}>{p.reviewed_by ? `oleh ${p.reviewed_by}` : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Tiada bayaran lagi.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'accounts' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="students-table">
              <thead>
                <tr>
                  <th>NAMA / EMAIL</th><th>PERANAN</th><th>STATUS</th><th>LANGGANAN</th><th>DAFTAR</th><th>TINDAKAN</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.email}>
                    <td><strong>{a.full_name || '—'}</strong><br /><span style={{ fontSize: 12, color: '#64748b' }}>{a.email}</span></td>
                    <td>{a.role === 'superadmin' ? '🛡️ Superadmin' : '👤 Pengguna'}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                        background: a.active_now ? '#dcfce7' : '#fee2e2', color: a.active_now ? '#166534' : '#991b1b',
                      }}>{a.active_now ? 'Aktif' : 'Tidak Aktif'}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{subLabel(a)}</td>
                    <td>{fmtDate(a.created_at)}</td>
                    <td>
                      {a.role !== 'superadmin' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => updateAccount(a.email, { status: 'active', extendMonths: 1 })}>+1 Bulan</button>
                          <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => updateAccount(a.email, { status: 'active', unlimited: true })}>∞ Tanpa Had</button>
                          {a.status === 'active'
                            ? <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => updateAccount(a.email, { status: 'inactive' })}>Nyahaktif</button>
                            : <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => updateAccount(a.email, { status: 'active' })}>Aktifkan</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Tiada pengguna.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {receiptModal.open && (
        <div className="modal-overlay" onClick={() => setReceiptModal({ open: false, src: null, loading: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2>Resit Bayaran</h2>
            {receiptModal.loading ? <p>Memuatkan…</p> : receiptModal.src
              ? <img src={receiptModal.src} alt="Resit" style={{ width: '100%', borderRadius: 8 }} />
              : <p>Tiada resit.</p>}
            <div className="modal-buttons">
              <button className="btn btn-outline" onClick={() => setReceiptModal({ open: false, src: null, loading: false })}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

const FEATURES = [
  {
    icon: '⭐',
    title: 'Penilaian Tahap Penguasaan (TP1–TP6)',
    desc: 'Nilai murid mengikut Standard Pembelajaran KSSR dengan pantas — satu klik untuk setiap tahap penguasaan, termasuk TD (Tidak Dinilai).',
  },
  {
    icon: '📈',
    title: 'Rekod Perkembangan & Purata Kelas',
    desc: 'Lihat kemajuan penilaian setiap kelas secara masa nyata, purata penguasaan dan taburan TP dalam satu paparan kemas.',
  },
  {
    icon: '📊',
    title: 'Analisis & Carta Automatik',
    desc: 'Carta murid mengikut kelas, penilaian mengikut guru dan subjek — faham prestasi sekolah anda sekilas pandang.',
  },
  {
    icon: '📄',
    title: 'Eksport Laporan PDF & CSV',
    desc: 'Jana Rekod Perkembangan Murid yang kemas untuk dicetak atau dikongsi, lengkap dengan warna tahap penguasaan.',
  },
  {
    icon: '👥',
    title: 'Urus Murid, Kelas, Guru & Subjek',
    desc: 'Pangkalan data terpusat untuk semua maklumat sekolah, termasuk import senarai murid secara pukal melalui CSV.',
  },
  {
    icon: '🔒',
    title: 'Selamat & Peribadi',
    desc: 'Log masuk dengan Google. Data setiap guru terasing sepenuhnya — hanya anda yang boleh melihat rekod anda.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { status } = useSession();

  // Signed-in visitors don't need the marketing page — send them to the app.
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="landing">
      <header className="nav">
        <div className="brand">
          <img src="/logo.png" alt="Logo" />
          <div>
            <strong>Sistem Penilaian Murid</strong>
            <span>SK Taman Jasmin</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="link-btn" onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
            Log Masuk
          </button>
          <button className="cta-btn" onClick={() => router.push('/subscribe')}>
            Langgan Sekarang
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-badge">✨ Platform Penilaian Murid Digital</div>
        <h1>
          Penilaian Tahap Penguasaan Murid,<br />
          <span className="grad">Mudah &amp; Pantas.</span>
        </h1>
        <p className="sub">
          Rekod, analisis dan laporkan perkembangan murid mengikut Standard
          Pembelajaran KSSR — semua dalam satu sistem mesra guru. Jimatkan masa,
          fokus pada mengajar.
        </p>
        <div className="hero-actions">
          <button className="cta-btn big" onClick={() => router.push('/subscribe')}>
            Mula dengan RM10/bulan
          </button>
          <button className="ghost-btn big" onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
            Saya sudah melanggan →
          </button>
        </div>
        <div className="trust">Digunakan oleh guru untuk menilai ratusan murid setiap hari.</div>
      </section>

      <section className="features" id="features">
        <h2>Semua yang guru perlukan</h2>
        <p className="section-sub">Direka khas untuk aliran kerja penilaian di sekolah rendah.</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing" id="pricing">
        <h2>Harga mudah, tiada kontrak</h2>
        <p className="section-sub">Satu pelan, semua ciri. Batalkan bila-bila masa.</p>
        <div className="price-card">
          <div className="price-tag">
            <span className="currency">RM</span>
            <span className="amount">10</span>
            <span className="period">/ bulan</span>
          </div>
          <ul className="price-list">
            <li>✅ Penilaian TP tanpa had</li>
            <li>✅ Murid, kelas, guru &amp; subjek tanpa had</li>
            <li>✅ Analisis &amp; carta automatik</li>
            <li>✅ Eksport PDF &amp; CSV</li>
            <li>✅ Import murid melalui CSV</li>
            <li>✅ Log masuk selamat dengan Google</li>
          </ul>
          <button className="cta-btn big full" onClick={() => router.push('/subscribe')}>
            Langgan melalui DuitNow QR
          </button>
          <p className="pay-note">Bayaran mudah &amp; selamat menerusi DuitNow QR (perbankan Malaysia).</p>
        </div>
      </section>

      <section className="how">
        <h2>Bermula dalam 3 langkah</h2>
        <div className="steps">
          <div className="step"><span>1</span><p>Imbas DuitNow QR &amp; bayar RM10 melalui aplikasi bank anda.</p></div>
          <div className="step"><span>2</span><p>Muat naik resit &amp; masukkan email Google anda.</p></div>
          <div className="step"><span>3</span><p>Kami aktifkan akaun anda — terus log masuk &amp; mula menilai.</p></div>
        </div>
        <button className="cta-btn big" onClick={() => router.push('/subscribe')}>
          Langgan Sekarang
        </button>
      </section>

      <footer className="foot">
        <img src="/logo.png" alt="Logo" />
        <p>Sistem Pengurusan Penilaian Murid — SK Taman Jasmin</p>
        <p className="muted">© {new Date().getFullYear()} · Semua hak terpelihara.</p>
      </footer>

      <style jsx>{`
        .landing {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #1e293b;
          background: #f8fafc;
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 6vw;
          position: sticky;
          top: 0;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: saturate(180%) blur(12px);
          border-bottom: 1px solid #eef1f6;
          z-index: 10;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand img { width: 44px; height: 44px; object-fit: contain; }
        .brand strong { display: block; font-size: 15px; }
        .brand span { font-size: 12px; color: #64748b; }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .link-btn {
          background: none; border: none; cursor: pointer;
          font-weight: 600; color: #475569; font-size: 15px; font-family: inherit;
        }
        .cta-btn {
          background: linear-gradient(120deg, #4f46e5, #6366f1);
          color: white; border: none; border-radius: 10px;
          padding: 10px 18px; font-weight: 700; font-size: 15px;
          cursor: pointer; font-family: inherit;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(79,70,229,0.32); }
        .cta-btn.big { padding: 15px 28px; font-size: 17px; }
        .cta-btn.full { width: 100%; }
        .ghost-btn {
          background: white; color: #4f46e5; border: 1.5px solid #dfe2ee;
          border-radius: 10px; padding: 15px 24px; font-weight: 700; font-size: 17px;
          cursor: pointer; font-family: inherit;
        }
        .ghost-btn:hover { border-color: #b9c0e0; }
        .hero {
          text-align: center;
          padding: 80px 6vw 70px;
          background:
            radial-gradient(1200px 500px at 50% -10%, rgba(99,102,241,0.16), transparent 70%),
            linear-gradient(180deg, #ffffff, #f8fafc);
        }
        .hero-badge {
          display: inline-block; background: #eef2ff; color: #4f46e5;
          padding: 7px 16px; border-radius: 999px; font-size: 13px; font-weight: 700;
          margin-bottom: 22px;
        }
        .hero h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.1; margin: 0 0 18px; font-weight: 800; letter-spacing: -0.02em; }
        .grad {
          background: linear-gradient(120deg, #4f46e5, #6366f1, #14b8a6);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .sub { max-width: 640px; margin: 0 auto 32px; font-size: 18px; color: #475569; line-height: 1.6; }
        .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .trust { margin-top: 26px; font-size: 13px; color: #94a3b8; }
        .features, .pricing, .how { padding: 70px 6vw; max-width: 1100px; margin: 0 auto; text-align: center; }
        .features h2, .pricing h2, .how h2 { font-size: clamp(24px, 3.5vw, 34px); font-weight: 800; margin: 0 0 8px; }
        .section-sub { color: #64748b; margin: 0 0 42px; font-size: 16px; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; text-align: left; }
        .feature-card {
          background: white; border: 1px solid #eef1f6; border-radius: 16px; padding: 26px;
          box-shadow: 0 4px 14px rgba(15,23,42,0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(15,23,42,0.08); }
        .feature-icon { font-size: 30px; margin-bottom: 12px; }
        .feature-card h3 { margin: 0 0 8px; font-size: 18px; }
        .feature-card p { margin: 0; color: #64748b; line-height: 1.55; font-size: 14.5px; }
        .pricing { background: linear-gradient(180deg, #f8fafc, #eef2ff); border-radius: 28px; }
        .price-card {
          background: white; border-radius: 22px; max-width: 440px; margin: 0 auto;
          padding: 40px 34px; box-shadow: 0 24px 60px rgba(79,70,229,0.14); border: 1px solid #e7eaf6;
        }
        .price-tag { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin-bottom: 24px; }
        .currency { font-size: 24px; font-weight: 700; color: #4f46e5; }
        .amount { font-size: 64px; font-weight: 800; letter-spacing: -0.03em; }
        .period { font-size: 18px; color: #94a3b8; }
        .price-list { list-style: none; padding: 0; margin: 0 0 28px; text-align: left; }
        .price-list li { padding: 9px 0; border-bottom: 1px dashed #eef1f6; font-size: 15px; color: #334155; }
        .pay-note { margin: 14px 0 0; font-size: 12.5px; color: #94a3b8; }
        .how .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 36px; }
        .step { background: white; border: 1px solid #eef1f6; border-radius: 16px; padding: 26px; text-align: center; }
        .step span {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 50%; margin-bottom: 14px;
          background: linear-gradient(120deg, #4f46e5, #6366f1); color: white; font-weight: 800;
        }
        .step p { margin: 0; color: #475569; line-height: 1.5; }
        .foot { text-align: center; padding: 46px 6vw; border-top: 1px solid #eef1f6; background: white; }
        .foot img { width: 46px; height: 46px; object-fit: contain; margin-bottom: 10px; }
        .foot p { margin: 4px 0; color: #475569; font-weight: 600; }
        .foot .muted { color: #94a3b8; font-weight: 400; font-size: 13px; }
      `}</style>
    </div>
  );
}

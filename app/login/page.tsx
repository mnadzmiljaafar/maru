'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // AccessDenied = signed in with Google, but no active subscription (unknown
  // email or lapsed subscription). Show a friendly "reactivate" card instead of
  // a blunt access-denied message.
  const subscriptionRequired = errorParam === 'AccessDenied';
  const genericError =
    errorParam && !subscriptionRequired ? 'Ralat semasa log masuk. Sila cuba lagi.' : '';

  const GoogleButton = ({ label }: { label: string }) => (
    <button
      type="button"
      className="google-button"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      disabled={status === 'loading'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      {status === 'loading' ? 'Memuatkan...' : label}
    </button>
  );

  return (
    <div className="login-container">
      {subscriptionRequired ? (
        <div className="login-card">
          <div className="login-header">
            <div className="lock-badge">🔒</div>
            <h1>Langganan Diperlukan</h1>
            <p>Akaun anda tiada langganan aktif</p>
          </div>

          <div className="sub-message">
            Email anda belum melanggan atau langganan anda telah tamat tempoh.
            Untuk mengakses sistem, sila langgan atau perbaharui langganan anda
            <strong> (RM10/bulan)</strong>.
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => router.push('/subscribe')}
          >
            💳 Langgan / Perbaharui Langganan
          </button>

          <GoogleButton label="Cuba Email Lain" />

          <p className="login-note">
            Sudah membayar? Akaun diaktifkan sebaik sahaja bayaran disahkan
            (biasanya dalam 24 jam). Cuba log masuk semula selepas itu.
          </p>
        </div>
      ) : (
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.png" alt="Logo" className="login-logo" />
            <h1>Sistem Penilaian Murid</h1>
            <p>Sekolah Kebangsaan Taman Jasmin</p>
          </div>

          {genericError && <div className="error-message">{genericError}</div>}

          <GoogleButton label="Log Masuk dengan Google" />

          <p className="login-note">
            Belum melanggan?{' '}
            <a className="inline-link" onClick={() => router.push('/subscribe')}>
              Langgan di sini
            </a>
            .
          </p>
        </div>
      )}

      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 55%, #6d28d9 100%);
          background-attachment: fixed;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 22px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
          padding: 44px 40px;
          width: 100%;
          max-width: 420px;
          text-align: center;
          animation: slideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header {
          margin-bottom: 28px;
        }

        .login-logo {
          width: 96px;
          height: 96px;
          object-fit: contain;
          margin-bottom: 16px;
          padding: 8px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
        }

        .lock-badge {
          width: 82px;
          height: 82px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border-radius: 22px;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.16);
        }

        .sub-message {
          background: #f8fafc;
          border: 1px solid #eef1f6;
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 20px;
          font-size: 14.5px;
          line-height: 1.6;
          color: #475569;
          text-align: left;
        }

        .primary-button {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          margin-bottom: 12px;
          background: linear-gradient(120deg, #4f46e5, #6366f1);
          color: white;
          border: none;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(79, 70, 229, 0.32);
        }

        .inline-link {
          color: #4f46e5;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
        }

        .login-header h1 {
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(120deg, #4f46e5, #6366f1, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-header p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .google-button {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px;
          background: white;
          color: #1f2937;
          border: 1.5px solid #e9ecf3;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .google-button:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: #cdd3e0;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
        }

        .google-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          padding: 12px 14px;
          margin-bottom: 18px;
          background-color: #fff1f2;
          color: #e11d48;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          border-left: 4px solid #f43f5e;
          text-align: left;
        }

        .login-note {
          margin: 18px 0 0 0;
          font-size: 12.5px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

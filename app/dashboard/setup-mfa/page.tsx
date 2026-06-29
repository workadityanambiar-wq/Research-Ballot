'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function SetupMfaPage() {
  const { user } = useApp();
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup-mfa')
      .then(r => r.json())
      .then(d => { setQrDataUrl(d.qrDataUrl); setSecret(d.secret); })
      .catch(() => setError('Failed to load MFA setup.'))
      .finally(() => setLoadingQr(false));
  }, []);

  const handleConfirm = async (totpCode: string) => {
    if (totpCode.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/confirm-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Verification failed.'); return; }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>MFA Enabled</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Authenticator configured. Redirecting to dashboard…</div>
    </div>
  );

  return (
    <div className="dash-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Set Up Authenticator</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            {user?.role === 'CIO' || user?.role === 'PM'
              ? 'MFA is mandatory for your role. Scan the QR code with your authenticator app.'
              : 'Scan the QR code with your authenticator app to enable MFA.'}
          </div>
        </div>
        <div className="panel" style={{ padding: 24 }}>
          {loadingQr ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 11 }}>
              Loading QR code…
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="TOTP QR Code" style={{ width: 200, height: 200, border: '4px solid white', borderRadius: 4 }} />
                )}
              </div>
              <div style={{ marginBottom: 16, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
                <div style={{ marginBottom: 4 }}>Can&apos;t scan? Enter this key manually:</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text)', letterSpacing: '0.1em', wordBreak: 'break-all' }}>{secret}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label">VERIFY CODE</div>
                <input
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center', fontFamily: 'var(--mono)' }}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(val);
                    if (val.length === 6) handleConfirm(val);
                  }}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>
                  {error}
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.6 : 1 }}
                onClick={() => handleConfirm(code)}
                disabled={loading || code.length !== 6}
              >
                {loading ? 'VERIFYING…' : 'CONFIRM & ENABLE MFA →'}
              </button>
              <div style={{ marginTop: 10, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
                Use Google Authenticator, Authy, or any TOTP-compatible app
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

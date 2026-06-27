'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Step = 'credentials' | 'mfa';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mfaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status, router]);

  const handleCredentials = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed.');
        return;
      }

      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setStep('mfa');
        setTimeout(() => mfaRef.current?.focus(), 100);
        return;
      }

      if (data.mustChangePassword || data.passwordExpired) {
        router.push('/set-password');
        return;
      }

      if (data.mustEnrollMfa) {
        router.push('/dashboard/setup-mfa');
        return;
      }

      if (data.success) {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (code: string) => {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, totpCode: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'MFA verification failed.');
        setMfaCode('');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
        LOADING…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <svg width="32" height="28" viewBox="0 0 28 24" fill="none">
            <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
            <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--bg)"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.1em' }}>CENTURY FINANCIAL</div>
            <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.08em' }}>RESEARCH BALLOT PLATFORM</div>
          </div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          {step === 'credentials' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sign In</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Use your Century Financial email and password</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">EMAIL</div>
                <input
                  className="inp"
                  type="email"
                  placeholder="you@century.ae"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCredentials()}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label">PASSWORD</div>
                <input
                  className="inp"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCredentials()}
                  autoComplete="current-password"
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
                onClick={handleCredentials}
                disabled={loading || !email || !password}
              >
                {loading ? 'SIGNING IN…' : 'SIGN IN →'}
              </button>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <a
                  href="/reset-password"
                  style={{ fontSize: 10, color: 'var(--text3)', textDecoration: 'none' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  Forgot password?
                </a>
              </div>
            </>
          )}

          {step === 'mfa' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Authenticator Code</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Enter the 6-digit code from your authenticator app</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label">TOTP CODE</div>
                <input
                  ref={mfaRef}
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center', fontFamily: 'var(--mono)' }}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setMfaCode(val);
                    if (val.length === 6) handleMfa(val);
                  }}
                  autoComplete="one-time-code"
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
                onClick={() => handleMfa(mfaCode)}
                disabled={loading || mfaCode.length !== 6}
              >
                {loading ? 'VERIFYING…' : 'VERIFY →'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, color: 'var(--text3)' }}
                onClick={() => { setStep('credentials'); setMfaCode(''); setError(''); }}
              >
                ← Back to login
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 9, color: 'var(--text4)' }}>
          Century Financial Research Platform · Confidential · W26-2025
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [mode, setMode] = useState<'request' | 'reset'>(token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token) setMode('reset');
  }, [token]);

  const handleRequest = async () => {
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Reset failed.'); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done && mode === 'request') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Check Your Email</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', maxWidth: 300 }}>If an account with that email exists, a reset link has been sent. Check your inbox.</div>
      <a href="/login" style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', marginTop: 8 }}>← Back to login</a>
    </div>
  );

  if (done && mode === 'reset') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Password Reset</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Your password has been updated. Redirecting to login…</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
            <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
            <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--bg)"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.1em' }}>CENTURY FINANCIAL</div>
            <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.08em' }}>PASSWORD RESET</div>
          </div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          {mode === 'request' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Reset Password</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Enter your email address and we&apos;ll send a reset link (valid 30 min)</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label">EMAIL ADDRESS</div>
                <input className="inp" type="email" placeholder="you@century.ae" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRequest()} autoFocus />
              </div>
              {error && <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>{error}</div>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.6 : 1 }} onClick={handleRequest} disabled={loading || !email}>
                {loading ? 'SENDING…' : 'SEND RESET LINK →'}
              </button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Set New Password</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>12+ characters · Uppercase · Lowercase · Number · Special character</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">NEW PASSWORD</div>
                <input className="inp" type="password" placeholder="New password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="form-label">CONFIRM PASSWORD</div>
                <input className="inp" type="password" placeholder="Re-enter new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} />
              </div>
              {error && <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>{error}</div>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.6 : 1 }} onClick={handleReset} disabled={loading || !newPwd || !confirmPwd}>
                {loading ? 'RESETTING…' : 'RESET PASSWORD →'}
              </button>
            </>
          )}

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href="/login" style={{ fontSize: 10, color: 'var(--text3)', textDecoration: 'none' }}>← Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

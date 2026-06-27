'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function SetPasswordPage() {
  const { user } = useApp();
  const router = useRouter();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPwd }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Failed to set password.'); return; }

      setDone(true);
      // CIO/PM → must enroll MFA; others → dashboard
      if (user?.role === 'CIO' || user?.role === 'PM') {
        setTimeout(() => router.push('/dashboard/setup-mfa'), 1500);
      } else {
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Password Set</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
        {(user?.role === 'CIO' || user?.role === 'PM') ? 'Redirecting to MFA setup…' : 'Redirecting to platform…'}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 400 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Set Your Password</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>First login — create a permanent password for your account</div>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          {user && (
            <div style={{ marginBottom: 16, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
                {user.displayName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{user.displayName}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>{user.title}</div>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">NEW PASSWORD</div>
            <input className="inp" type="password" placeholder="Min. 12 chars, uppercase, lowercase, number, symbol" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="form-label">CONFIRM PASSWORD</div>
            <input className="inp" type="password" placeholder="Re-enter your password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div style={{ marginBottom: 12, padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 9, color: 'var(--text4)' }}>
            Requirements: 12+ characters · Uppercase · Lowercase · Number · Special character
          </div>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>
              {error}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={loading || !newPwd || !confirmPwd}
          >
            {loading ? 'SETTING PASSWORD…' : 'SET PASSWORD →'}
          </button>
          <div style={{ marginTop: 10, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
            Stored securely · Argon2id hashed · Audit logged
          </div>
        </div>
      </div>
    </div>
  );
}

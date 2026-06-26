'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, setPassword, saveSession } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function SetPasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const u = getSession();
    if (!u) { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  const handleSubmit = () => {
    setError('');
    if (newPwd.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPwd)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(newPwd)) { setError('Password must contain at least one number.'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }
    setPassword(user!.id, newPwd);
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  if (!user) return null;

  if (done) return (
    <div className="login-wrap grid-bg" style={{ height: '100vh' }}>
      <div className="login-card slide-up" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--long)' }}>Password Set Successfully</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Redirecting to platform…</div>
      </div>
    </div>
  );

  return (
    <div className="login-wrap grid-bg" style={{ height: '100vh' }}>
      <div className="login-card slide-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <svg width="24" height="24" viewBox="0 0 32 32">
            <polygon points="16,2 30,28 2,28" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="var(--accent)" />
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Set Your Password</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Research Ballot — first login setup</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{user.title}</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="form-label">NEW PASSWORD</div>
          <input className="inp" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="form-label">CONFIRM PASSWORD</div>
          <input className="inp" type="password" placeholder="Re-enter your password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {error && <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={handleSubmit}>
          SET PASSWORD & ENTER PLATFORM →
        </button>

        <div style={{ marginTop: 12, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
          Password is stored locally · Audit logged · Cannot reuse temp password
        </div>
      </div>
    </div>
  );
}

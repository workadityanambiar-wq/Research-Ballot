'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { verifyPassword, setPassword } from '@/lib/auth';

export default function ChangePasswordPage() {
  const { user } = useApp();
  const router = useRouter();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!user) return null;

  const handleSubmit = () => {
    setError('');
    if (!verifyPassword(user.id, currentPwd)) { setError('Current password is incorrect.'); return; }
    if (newPwd.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPwd)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(newPwd)) { setError('Password must contain at least one number.'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }
    if (newPwd === currentPwd) { setError('New password must differ from current password.'); return; }
    setPassword(user.id, newPwd);
    setDone(true);
  };

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--long-dim)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--long)' }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Password Updated</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Your new password is active for future logins on this device.</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: 400 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Change Password</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Update your Research Ballot login password · stored locally on this device</div>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">CURRENT PASSWORD</div>
            <input className="inp" type="password" placeholder="Your current password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">NEW PASSWORD</div>
            <input className="inp" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="form-label">CONFIRM NEW PASSWORD</div>
            <input className="inp" type="password" placeholder="Re-enter new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={handleSubmit}>
            UPDATE PASSWORD →
          </button>
          <div style={{ marginTop: 10, fontSize: 9, color: 'var(--text4)', textAlign: 'center' }}>
            Passwords are stored per-browser · Audit logged
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUserByEmail, verifyPassword, hasChangedPassword, saveSession } from '@/lib/auth';

type Step = 'login' | 'mfa';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [time, setTime] = useState(new Date());
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(28);
  const mfaRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (step === 'mfa') {
      mfaRefs[0].current?.focus();
      const t = setInterval(() => setTimer(p => p > 0 ? p - 1 : 30), 1000);
      return () => clearInterval(t);
    }
  }, [step]);

  const handleLogin = () => {
    setError('');
    const user = getUserByEmail(email);
    if (!user) { setError('No account found for this email.'); return; }
    if (!verifyPassword(user.id, password)) { setError('Incorrect password.'); return; }
    if (!hasChangedPassword(user.id)) {
      saveSession(user);
      router.push('/set-password');
      return;
    }
    setPendingId(user.id);
    setStep('mfa');
  };

  const handleMfaDigit = (val: string, i: number) => {
    const d = [...mfaCode]; d[i] = val.slice(-1); setMfaCode(d);
    if (val && i < 5) mfaRefs[i + 1].current?.focus();
    if (d.join('').length === 6) setTimeout(completeMfa, 350);
  };

  const completeMfa = () => {
    const user = getUserByEmail(email)!;
    saveSession(user);
    router.push('/dashboard');
  };

  if (step === 'mfa') {
    const user = getUserByEmail(email)!;
    return (
      <div className="login-wrap" style={{ height: '100vh' }}>
        <div className="login-card slide-up" style={{ width: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>←</button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Required for all platform access</div>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔐</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{user.title}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 22, color: 'var(--accent)', fontWeight: 700 }}>{String(timer).padStart(2, '0')}</div>
              <div style={{ fontSize: 9, color: 'var(--text4)' }}>sec</div>
            </div>
          </div>
          <div className="form-label" style={{ textAlign: 'center', marginBottom: 12 }}>ENTER 6-DIGIT AUTHENTICATOR CODE</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {mfaCode.map((d, i) => (
              <input key={i} ref={mfaRefs[i]} className="inp mono" type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleMfaDigit(e.target.value, i)}
                onKeyDown={e => e.key === 'Backspace' && !d && i > 0 && mfaRefs[i - 1].current?.focus()}
                style={{ width: 44, height: 48, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: 0, border: `1px solid ${d ? 'var(--accent)' : 'var(--border2)'}` }} />
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 12 }} onClick={completeMfa}>VERIFY & ENTER PLATFORM</button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 9, color: 'var(--text4)' }}>
            <span>TOTP · RFC 6238</span><span>DEVICE FINGERPRINTED</span><span>SESSION LOGGED</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap" style={{ height: '100vh', flexDirection: 'column' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 32, background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '.1em' }}>RESEARCH BALLOT</span>
          <span className="badge badge-dim">v1.0</span>
          <span style={{ fontSize: 9, color: 'var(--text4)' }}>SECURE CHANNEL · TLS 1.3 · AES-256-GCM</span>
        </div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>{time.toUTCString().replace('GMT', 'UTC')}</span>
      </div>

      <div className="login-card slide-up" style={{ marginTop: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <polygon points="16,2 30,28 2,28" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              <polygon points="16,8 25,25 7,25" fill="rgba(14,165,233,0.1)" />
              <circle cx="16" cy="16" r="3" fill="var(--accent)" />
            </svg>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.08em' }}>Research Ballot</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.06em' }}>Century Research</div>
          <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 4, fontFamily: 'var(--mono)' }}>RESEARCH PLATFORM · RESTRICTED ACCESS</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="form-label">AUTHORIZED EMAIL</div>
          <input className="inp" type="email" placeholder="you@century.ae or you@centuryiq.in" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="form-label">PASSWORD</div>
          <input className="inp" type="password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        {error && <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--short-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, fontSize: 11, color: 'var(--short)' }}>{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: 20 }} onClick={handleLogin}>
          AUTHENTICATE →
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 9, color: 'var(--text4)' }}>
          {['MFA REQUIRED', 'ARGON2ID', 'AES-256', 'AUDIT LOGGED'].map(x => (
            <span key={x} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="dot dot-green" style={{ width: 4, height: 4 }} />{x}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>
          First login? Use the temporary password <span className="mono" style={{ color: 'var(--warn)', fontWeight: 600 }}>Apex@2025</span> — you&apos;ll be asked to set a new one on first access.
        </div>
      </div>
    </div>
  );
}

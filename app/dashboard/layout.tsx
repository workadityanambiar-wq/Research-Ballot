'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import TickerBar from '@/components/layout/TickerBar';
import { getSession } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const u = getSession();
      if (u) { setUser(u); }
      else { router.push('/login'); }
    }
  }, [user, setUser, router]);

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
      LOADING RESEARCH BALLOT…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TickerBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar user={user} onLogout={logout} />
        <div style={{ flex: 1, overflow: 'hidden' }} className="slide-up">
          {children}
        </div>
      </div>
    </div>
  );
}

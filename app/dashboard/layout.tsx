'use client';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import TickerBar from '@/components/layout/TickerBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, logout } = useApp();

  if (sessionLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
        LOADING RESEARCH BALLOT…
      </div>
    );
  }

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

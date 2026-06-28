'use client';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import TickerBar from '@/components/layout/TickerBar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Bottom nav items shown on mobile
const BOTTOM_NAV = [
  { icon: '▤', label: 'Home', href: '/dashboard' },
  { icon: '⬡', label: 'Research', href: '/dashboard/research' },
  { icon: '☑', label: 'Ballot', href: '/dashboard/ballot' },
  { icon: '⬡', label: 'Committee', href: '/dashboard/committee' },
  { icon: '◎', label: 'Portfolio', href: '/dashboard/positions' },
];

// Derive a short page title from path
function getPageTitle(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return 'Dashboard';
  const last = segments[segments.length - 1];
  const map: Record<string, string> = {
    ballot: 'Weekly Ballot', submit: 'Submit Idea', committee: 'Committee',
    research: 'Research', market: 'Trade', rankings: 'Rankings',
    positions: 'Positions', trades: 'Trades', risk: 'Risk',
    performance: 'Performance', portfolio: 'Portfolio', approval: 'Approval',
    analysts: 'Analysts', attribution: 'Attribution', audit: 'Audit',
    security: 'Security', gaming: 'Anti-Gaming', cio: 'Executive View',
    watchlists: 'Watchlists', calendar: 'Calendar', search: 'Search',
    meetings: 'Meetings', archive: 'Archive', analytics: 'Analytics',
  };
  return map[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, logout } = useApp();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  if (sessionLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
        LOADING RESEARCH BALLOT…
      </div>
    );
  }

  const pageTitle = getPageTitle(pathname);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Ticker bar (hidden on mobile via CSS) */}
      <TickerBar />

      {/* Mobile header */}
      <header className="mob-header">
        <button className="mob-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <rect y="0" width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="5" width="12" height="2" rx="1" fill="currentColor"/>
            <rect y="10" width="16" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Logo */}
        <svg width="20" height="17" viewBox="0 0 28 24" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
          <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--panel)"/>
        </svg>

        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em', flex: 1 }}>{pageTitle}</span>

        {/* User avatar */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      </header>

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          user={user}
          onLogout={logout}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="slide-up">
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {BOTTOM_NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FAB: Submit Idea shortcut */}
      <Link href="/dashboard/submit" className="fab" aria-label="Submit research idea" title="Submit Idea">
        ✦
      </Link>
    </div>
  );
}

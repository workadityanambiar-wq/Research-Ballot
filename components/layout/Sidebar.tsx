'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { AuthUser } from '@/context/AppContext';
import { ROLE_COLOR } from '@/lib/permissions';
import { TierBadge } from '@/components/ui/Badge';

interface NavItem { id: string; label: string; icon: string; href: string; cioOnly?: boolean }
interface NavSection { section: string; cioOnly?: boolean }
type NavEntry = NavItem | NavSection;

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤', href: '/dashboard' },
  { id: 'search', label: 'Search', icon: '⌕', href: '/dashboard/search' },
  { section: 'RESEARCH OS' },
  { id: 'research', label: 'Research Pipeline', icon: '⬡', href: '/dashboard/research' },
  { id: 'calendar', label: 'Calendar', icon: '▦', href: '/dashboard/calendar' },
  { id: 'watchlists', label: 'Watchlists', icon: '◷', href: '/dashboard/watchlists' },
  { section: 'VOTING' },
  { id: 'ballot', label: 'Weekly Ballot', icon: '☑', href: '/dashboard/ballot' },
  { id: 'submit', label: 'Submit Idea', icon: '✦', href: '/dashboard/submit' },
  { id: 'market', label: 'Credit Market', icon: '◈', href: '/dashboard/market' },
  { id: 'rankings', label: 'Trade Rankings', icon: '◉', href: '/dashboard/rankings' },
  { section: 'PORTFOLIO' },
  { id: 'cio', label: 'Executive View', icon: '◈', href: '/dashboard/cio' },
  { id: 'positions', label: 'Positions', icon: '◎', href: '/dashboard/positions' },
  { id: 'trades', label: 'Trades', icon: '⟳', href: '/dashboard/trades' },
  { id: 'risk', label: 'Risk Dashboard', icon: '⛨', href: '/dashboard/risk' },
  { id: 'performance', label: 'Performance', icon: '◇', href: '/dashboard/performance' },
  { section: 'ALLOCATION' },
  { id: 'portfolio', label: 'Portfolio Allocation', icon: '⬡', href: '/dashboard/portfolio' },
  { id: 'approval', label: 'Trade Approval', icon: '✓', href: '/dashboard/approval' },
  { section: 'ANALYTICS' },
  { id: 'analysts', label: 'Analyst Scoring', icon: '◆', href: '/dashboard/analysts' },
  { id: 'attribution', label: 'Attribution', icon: '◇', href: '/dashboard/attribution' },
  { section: 'SECURITY', cioOnly: true },
  { id: 'gaming', label: 'Anti-Gaming Engine', icon: '⚠', href: '/dashboard/gaming', cioOnly: true },
  { id: 'audit', label: 'Audit Log', icon: '≡', href: '/dashboard/audit', cioOnly: true },
  { id: 'security', label: 'Security Dashboard', icon: '⛨', href: '/dashboard/security', cioOnly: true },
];

export default function Sidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();
  const isCio = user.role === 'CIO';
  const initials = user.name.split(' ').map(n => n[0]).join('');

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const current = stored ?? (document.documentElement.getAttribute('data-theme') ?? 'light');
    setTheme(current as 'light' | 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div style={{ width: 196, minWidth: 196, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--border)', flexShrink: 0, boxShadow: '1px 0 0 var(--border)' }}>
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
            <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--panel)"/>
          </svg>
          <div style={{ lineHeight: 1, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: '.07em' }}>CENTURY</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--text3)', letterSpacing: '.1em', marginTop: 3 }}>FINANCIAL</div>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 13, padding: '2px 4px', borderRadius: 4, lineHeight: 1, transition: 'color .15s' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text4)')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)' }}>{user.title}</div>
          </div>
          <TierBadge tier={user.tier} />
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text4)' }}>
          <span className="dot dot-green" />ACTIVE{user.mfaEnabled ? ' · MFA ✓' : ''}
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: '6px' }}>
        {NAV.map((item, i) => {
          if ('section' in item) {
            if (item.cioOnly && !isCio) return null;
            return <div key={i} className="nav-section">{item.section}</div>;
          }
          if (item.cioOnly && !isCio) return null;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
              <div className={`nav-item ${active ? 'active' : ''}`}>
                <span style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: .7 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 8 }}>W26-2025 · {user.legacyId}</div>
        <Link href="/dashboard/change-password" style={{ textDecoration: 'none', display: 'block', marginBottom: 6 }}>
          <div className={`nav-item ${pathname === '/dashboard/change-password' ? 'active' : ''}`} style={{ padding: '5px 8px', fontSize: 10 }}>
            <span style={{ fontSize: 11, width: 14, textAlign: 'center', opacity: .7 }}>🔑</span>
            <span>Change Password</span>
          </div>
        </Link>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--text3)', borderColor: 'var(--border2)' }} onClick={onLogout}>SIGN OUT</button>
      </div>
    </div>
  );
}

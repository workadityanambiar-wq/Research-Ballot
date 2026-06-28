'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { AuthUser } from '@/context/AppContext';
import { TierBadge } from '@/components/ui/Badge';

interface NavItem { id: string; label: string; icon: string; href: string; cioOnly?: boolean }
interface NavSection { section: string; key: string; cioOnly?: boolean; defaultOpen?: boolean }
type NavEntry = NavItem | NavSection;

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤', href: '/dashboard' },
  { id: 'search', label: 'Search', icon: '⌕', href: '/dashboard/search' },
  { section: 'RESEARCH', key: 'research', defaultOpen: true },
  { id: 'research', label: 'Research Pipeline', icon: '⬡', href: '/dashboard/research' },
  { id: 'calendar', label: 'Calendar', icon: '▦', href: '/dashboard/calendar' },
  { id: 'watchlists', label: 'Watchlists', icon: '◷', href: '/dashboard/watchlists' },
  { section: 'VOTING', key: 'voting', defaultOpen: true },
  { id: 'ballot', label: 'Weekly Ballot', icon: '☑', href: '/dashboard/ballot' },
  { id: 'submit', label: 'Submit Idea', icon: '✦', href: '/dashboard/submit' },
  { id: 'market', label: 'Trade', icon: '◈', href: '/dashboard/market' },
  { id: 'rankings', label: 'Trade Rankings', icon: '◉', href: '/dashboard/rankings' },
  { section: 'COMMITTEE', key: 'committee', defaultOpen: true },
  { id: 'committee', label: 'Committee Hub', icon: '⬡', href: '/dashboard/committee' },
  { id: 'committee-meetings', label: 'Meetings', icon: '▦', href: '/dashboard/committee/meetings' },
  { id: 'committee-archive', label: 'Archive', icon: '≡', href: '/dashboard/committee/archive' },
  { id: 'allocation-queue', label: 'Alloc Queue', icon: '◷', href: '/dashboard/allocation-queue' },
  { id: 'action-center', label: 'Action Center', icon: '✦', href: '/dashboard/action-center' },
  { section: 'PORTFOLIO', key: 'portfolio', defaultOpen: false },
  { id: 'cio', label: 'Executive View', icon: '◈', href: '/dashboard/cio' },
  { id: 'positions', label: 'Positions', icon: '◎', href: '/dashboard/positions' },
  { id: 'trades', label: 'Trades', icon: '⟳', href: '/dashboard/trades' },
  { id: 'risk', label: 'Risk', icon: '⛨', href: '/dashboard/risk' },
  { id: 'performance', label: 'Performance', icon: '◇', href: '/dashboard/performance' },
  { section: 'ALLOCATION', key: 'allocation', defaultOpen: false },
  { id: 'portfolio', label: 'Portfolio', icon: '⬡', href: '/dashboard/portfolio' },
  { id: 'approval', label: 'Trade Approval', icon: '✓', href: '/dashboard/approval' },
  { section: 'ANALYTICS', key: 'analytics', defaultOpen: false },
  { id: 'analysts', label: 'Analyst Scoring', icon: '◆', href: '/dashboard/analysts' },
  { id: 'attribution', label: 'Attribution', icon: '◇', href: '/dashboard/attribution' },
  { section: 'SECURITY', key: 'security', cioOnly: true, defaultOpen: false },
  { id: 'gaming', label: 'Anti-Gaming', icon: '⚠', href: '/dashboard/gaming', cioOnly: true },
  { id: 'audit', label: 'Audit Log', icon: '≡', href: '/dashboard/audit', cioOnly: true },
  { id: 'security', label: 'Security', icon: '⛨', href: '/dashboard/security', cioOnly: true },
];

const SECTION_ITEMS: Record<string, string[]> = {};
let currentSection = '';
for (const entry of NAV) {
  if ('section' in entry) { currentSection = entry.key; SECTION_ITEMS[entry.key] = []; }
  else if (currentSection) SECTION_ITEMS[currentSection].push(entry.href);
}

export default function Sidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();
  const isCio = user.role === 'CIO';
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const current = stored ?? (document.documentElement.getAttribute('data-theme') ?? 'light');
    setTheme(current as 'light' | 'dark');

    const storedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (storedCollapsed) {
      try { setCollapsed(JSON.parse(storedCollapsed)); } catch { /* ignore */ }
    } else {
      // Initialize from defaultOpen
      const init: Record<string, boolean> = {};
      for (const entry of NAV) {
        if ('section' in entry) init[entry.key] = !(entry.defaultOpen ?? true);
      }
      setCollapsed(init);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const toggleSection = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
      return next;
    });
  };

  // Auto-expand the section containing the active route
  useEffect(() => {
    for (const [key, hrefs] of Object.entries(SECTION_ITEMS)) {
      if (hrefs.some(h => pathname === h || (h !== '/dashboard' && pathname.startsWith(h + '/')))) {
        setCollapsed(prev => {
          if (!prev[key]) return prev;
          const next = { ...prev, [key]: false };
          localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
          return next;
        });
        break;
      }
    }
  }, [pathname]);

  return (
    <div style={{ width: 192, minWidth: 192, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '13px 14px 11px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="26" height="22" viewBox="0 0 28 24" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="15" height="15" stroke="#E8A000" strokeWidth="2"/>
            <rect x="10" y="7" width="15" height="15" stroke="#E8A000" strokeWidth="2" fill="var(--panel)"/>
          </svg>
          <div style={{ lineHeight: 1, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', letterSpacing: '.07em' }}>CENTURY</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.1em', marginTop: 2 }}>FINANCIAL</div>
          </div>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 12, padding: '2px 3px', borderRadius: 3, lineHeight: 1 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* User card */}
      <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 1 }}>{user.role} · {user.title.split(' ')[0]}</div>
          </div>
          <TierBadge tier={user.tier} />
        </div>
      </div>

      {/* Nav */}
      <div className="scroll-y" style={{ flex: 1, padding: '4px 4px 0' }}>
        {NAV.map((entry, i) => {
          if ('section' in entry) {
            if (entry.cioOnly && !isCio) return null;
            const isCollapsed = collapsed[entry.key] ?? false;
            return (
              <button key={i} onClick={() => toggleSection(entry.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 8px 4px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text4)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
                  marginTop: i > 0 ? 4 : 0,
                }}>
                <span>{entry.section}</span>
                <span style={{ fontSize: 8, opacity: 0.6, transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}>▾</span>
              </button>
            );
          }

          if (entry.cioOnly && !isCio) return null;

          // Find parent section
          let parentKey = '';
          for (let j = i - 1; j >= 0; j--) {
            const prev = NAV[j];
            if ('section' in prev) { parentKey = prev.key; break; }
          }
          if (parentKey && collapsed[parentKey]) return null;

          const active = pathname === entry.href || (entry.href !== '/dashboard' && pathname.startsWith(entry.href + '/'));

          return (
            <Link key={entry.id} href={entry.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div className={`nav-item ${active ? 'active' : ''}`} style={{ marginBottom: 1 }}>
                <span style={{ fontSize: 10, width: 14, textAlign: 'center', opacity: .65, flexShrink: 0 }}>{entry.icon}</span>
                <span style={{ fontSize: 11 }}>{entry.label}</span>
              </div>
            </Link>
          );
        })}
        <div style={{ height: 8 }} />
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 6, paddingLeft: 4, fontFamily: 'var(--mono)' }}>
          {user.legacyId}{user.mfaEnabled ? ' · MFA ✓' : ''}
        </div>
        <Link href="/dashboard/change-password" style={{ textDecoration: 'none', display: 'block', marginBottom: 5 }}>
          <div className={`nav-item ${pathname === '/dashboard/change-password' ? 'active' : ''}`} style={{ padding: '4px 8px', fontSize: 10 }}>
            <span style={{ fontSize: 10, width: 14, textAlign: 'center', opacity: .65 }}>🔑</span>
            <span>Change Password</span>
          </div>
        </Link>
        <button className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center', fontSize: 10, color: 'var(--text3)', borderColor: 'var(--border)' }}
          onClick={onLogout}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}

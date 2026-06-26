'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { ROLE_COLOR } from '@/lib/permissions';
import { TierBadge } from '@/components/ui/Badge';

interface NavItem { id: string; label: string; icon: string; href: string; cioOnly?: boolean }
interface NavSection { section: string; cioOnly?: boolean }
type NavEntry = NavItem | NavSection;

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▤', href: '/dashboard' },
  { section: 'RESEARCH' },
  { id: 'submit', label: 'Submit Idea', icon: '✦', href: '/dashboard/submit' },
  { id: 'market', label: 'Ideas', icon: '◈', href: '/dashboard/market' },
  { id: 'rankings', label: 'Trade Rankings', icon: '◉', href: '/dashboard/rankings' },
  { section: 'PORTFOLIO' },
  { id: 'portfolio', label: 'Portfolio Allocation', icon: '◎', href: '/dashboard/portfolio' },
  { id: 'approval', label: 'Trade Approval', icon: '✓', href: '/dashboard/approval' },
  { section: 'ANALYTICS' },
  { id: 'analysts', label: 'Analyst Scoring', icon: '◆', href: '/dashboard/analysts' },
  { id: 'attribution', label: 'Attribution', icon: '◇', href: '/dashboard/attribution' },
  { section: 'SECURITY', cioOnly: true },
  { id: 'gaming', label: 'Anti-Gaming Engine', icon: '⚠', href: '/dashboard/gaming', cioOnly: true },
  { id: 'audit', label: 'Audit Log', icon: '≡', href: '/dashboard/audit', cioOnly: true },
  { id: 'security', label: 'Security Dashboard', icon: '⛨', href: '/dashboard/security', cioOnly: true },
];

export default function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const pathname = usePathname();
  const isCio = user.role === 'CIO';
  const initials = user.name.split(' ').map(n => n[0]).join('');

  return (
    <div style={{ width: 196, minWidth: 196, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--border)', flexShrink: 0, boxShadow: '1px 0 0 var(--border)' }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 32 32"><polygon points="16,3 29,27 3,27" fill="none" stroke="#fff" strokeWidth="2.5" /><circle cx="16" cy="16" r="3" fill="#fff" /></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.02em', color: 'var(--text)' }}>Research Ballot</span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.06em', paddingLeft: 32 }}>Century Research</div>
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
          <span className="dot dot-green" />ACTIVE · MFA ✓
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: '6px' }}>
        {NAV.map((item, i) => {
          if ('section' in item) {
            if (item.cioOnly && !isCio) return null;
            return <div key={i} className="nav-section">{item.section}</div>;
          }
          if (item.cioOnly && !isCio) return null;
          const active = pathname === item.href;
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
        <div className="mono" style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 8 }}>W26-2025 · {user.id}</div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--text3)', borderColor: 'var(--border2)' }} onClick={onLogout}>SIGN OUT</button>
      </div>
    </div>
  );
}

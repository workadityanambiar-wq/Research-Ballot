import type { Direction } from '@/lib/types';

export const TierBadge = ({ tier }: { tier: string }) => {
  const cls = { 'A+': 'badge badge-purple', A: 'badge badge-accent', B: 'badge badge-low', C: 'badge badge-warn' }[tier] ?? 'badge badge-dim';
  return <span className={cls}>{tier}</span>;
};

export const DirBadge = ({ dir }: { dir: Direction }) => (
  <span className={dir === 'LONG' ? 'badge badge-long' : 'badge badge-short'}>{dir}</span>
);

export const SevBadge = ({ sev }: { sev: 'HIGH' | 'MEDIUM' | 'LOW' }) => {
  const cls = { HIGH: 'badge badge-high', MEDIUM: 'badge badge-medium', LOW: 'badge badge-low' }[sev] ?? 'badge badge-dim';
  return <span className={cls}>{sev}</span>;
};

export const RiskBadge = ({ score }: { score: number }) => {
  if (score >= 70) return <span className="badge badge-high">CRITICAL</span>;
  if (score >= 40) return <span className="badge badge-medium">ELEVATED</span>;
  if (score >= 20) return <span className="badge badge-warn">WATCH</span>;
  return <span className="badge badge-low">CLEAR</span>;
};

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    APPROVED: 'badge-low', PENDING: 'badge-warn', REVIEW: 'badge-accent', REJECTED: 'badge-high',
  };
  return <span className={`badge ${map[status] ?? 'badge-dim'}`}>{status}</span>;
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const StatCard = ({ label, value, sub, color }: StatCardProps) => (
  <div className="panel" style={{ padding: '12px 14px' }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
    <div className="stat-val" style={{ color: color ?? 'var(--text)' }}>{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

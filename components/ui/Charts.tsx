'use client';

export const Sparkline = ({ data, color = 'var(--accent)', w = 80, h = 32 }: { data: number[]; color?: string; w?: number; h?: number }) => {
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * (w - 4) + 2},${h - ((v - min) / r) * (h - 4) - 2}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

interface DonutSlice { val: number; color: string }
export const Donut = ({ data, size = 110 }: { data: DonutSlice[]; size?: number }) => {
  const total = data.reduce((a, b) => a + b.val, 0);
  let angle = -90;
  const paths = data.map((d, i) => {
    const sweep = (d.val / total) * 360;
    if (sweep === 0) return null;
    const sa = angle; angle += sweep;
    const r1 = size / 2 - 8, r2 = size / 2 - 22, cx = size / 2, cy = size / 2;
    const tr = (a: number) => a * Math.PI / 180;
    const [x1, y1] = [cx + r1 * Math.cos(tr(sa)), cy + r1 * Math.sin(tr(sa))];
    const [x2, y2] = [cx + r1 * Math.cos(tr(angle)), cy + r1 * Math.sin(tr(angle))];
    const [x3, y3] = [cx + r2 * Math.cos(tr(angle)), cy + r2 * Math.sin(tr(angle))];
    const [x4, y4] = [cx + r2 * Math.cos(tr(sa)), cy + r2 * Math.sin(tr(sa))];
    const lg = sweep > 180 ? 1 : 0;
    return <path key={i} d={`M${x1},${y1} A${r1},${r1} 0 ${lg} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${lg} 0 ${x4},${y4} Z`} fill={d.color} opacity=".85" />;
  });
  return <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={size / 2 - 23} fill="var(--panel2)" stroke="var(--border)" strokeWidth="1" />{paths}</svg>;
};

export const HeatMatrix = ({ labels, data, sz = 22 }: { labels: string[]; data: number[][]; sz?: number }) => (
  <div style={{ fontSize: 8, fontFamily: 'var(--mono)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: `36px repeat(${labels.length},${sz}px)`, gap: 1, marginBottom: 2 }}>
      <div />{labels.map(l => <div key={l} style={{ color: 'var(--text4)', textAlign: 'center', overflow: 'hidden' }}>{l}</div>)}
    </div>
    {data.map((row, i) => (
      <div key={i} style={{ display: 'grid', gridTemplateColumns: `36px repeat(${labels.length},${sz}px)`, gap: 1, marginBottom: 1 }}>
        <div style={{ color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3 }}>{labels[i]}</div>
        {row.map((v, j) => {
          const ab = Math.abs(v);
          const bg = v > 0 ? `rgba(34,197,94,${ab * 0.7 + 0.1})` : v < 0 ? `rgba(239,68,68,${ab * 0.7 + 0.1})` : 'var(--border)';
          return <div key={j} className="heat-cell" style={{ width: sz, height: sz, background: bg, color: ab > 0.5 ? '#fff' : 'var(--text3)', fontSize: 8 }}>{i === j ? '—' : (v > 0 ? '+' : '') + (v * 100).toFixed(0)}</div>;
        })}
      </div>
    ))}
  </div>
);

interface GraphNode { id: string; label: string; x: number; y: number; r?: number; f?: boolean }
interface GraphEdge { from: string; to: string; w?: number; f?: boolean }
export const NetworkGraph = ({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) => (
  <svg width={320} height={210} style={{ background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
    {edges.map((e, i) => {
      const n1 = nodes.find(n => n.id === e.from), n2 = nodes.find(n => n.id === e.to);
      if (!n1 || !n2) return null;
      return <line key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={e.f ? 'rgba(220,38,38,0.6)' : 'rgba(37,99,235,0.2)'} strokeWidth={e.w ?? 1} strokeDasharray={e.f ? '4,2' : 'none'} />;
    })}
    {nodes.map(n => (
      <g key={n.id}>
        <circle cx={n.x} cy={n.y} r={n.r ?? 8} fill={n.f ? 'rgba(220,38,38,0.12)' : 'rgba(37,99,235,0.08)'} stroke={n.f ? 'var(--short)' : 'var(--accent)'} strokeWidth="1" />
        <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize="7" fill={n.f ? 'var(--short)' : 'var(--text2)'} fontFamily="var(--mono)">{n.label}</text>
      </g>
    ))}
  </svg>
);

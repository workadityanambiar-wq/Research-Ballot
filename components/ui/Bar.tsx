interface BarProps {
  val: number;
  max?: number;
  color?: string;
  h?: number;
}

export const Bar = ({ val, max = 100, color = 'var(--accent)', h = 3 }: BarProps) => (
  <div className="bar-track" style={{ height: h }}>
    <div className="bar-fill" style={{ width: `${Math.min((val / max) * 100, 100)}%`, background: color, height: h }} />
  </div>
);

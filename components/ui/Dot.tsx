type DotStatus = 'ACTIVE' | 'IDLE' | 'BLOCKED' | 'TERMINATED';

export const Dot = ({ status }: { status: DotStatus }) => {
  const cls = { ACTIVE: 'dot dot-green pulse', IDLE: 'dot dot-yellow', BLOCKED: 'dot dot-red pulse', TERMINATED: 'dot dot-gray' }[status] ?? 'dot dot-gray';
  return <span className={cls} />;
};

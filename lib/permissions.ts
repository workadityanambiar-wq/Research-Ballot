import type { User } from './types';

type Permission =
  | 'auditLog'
  | 'antiGaming'
  | 'security'
  | 'revealIdentities'
  | 'approveTrades'
  | 'adjustAllocations'
  | 'viewPortfolio'
  | 'viewAnalystPerf'
  | 'submitIdeas'
  | 'vote';

const PERM: Record<Permission, string[]> = {
  auditLog: ['CIO'],
  antiGaming: ['CIO'],
  security: ['CIO'],
  revealIdentities: ['CIO', 'PM'],
  approveTrades: ['CIO', 'PM'],
  adjustAllocations: ['CIO', 'PM'],
  viewPortfolio: ['CIO', 'PM', 'SR_ANALYST'],
  viewAnalystPerf: ['CIO', 'PM', 'SR_ANALYST'],
  submitIdeas: ['CIO', 'PM', 'SR_ANALYST', 'ANALYST'],
  vote: ['CIO', 'PM', 'SR_ANALYST', 'ANALYST'],
};

export const can = (user: User | null, p: Permission): boolean => {
  if (!user) return false;
  if (user.role === 'CIO') return true;
  return PERM[p]?.includes(user.role) ?? false;
};

export const ROLE_COLOR: Record<string, string> = {
  CIO: 'var(--purple)',
  PM: 'var(--accent)',
  SR_ANALYST: 'var(--long)',
  ANALYST: 'var(--text3)',
};

export const TIER_W: Record<string, number> = {
  'A+': 1.5,
  A: 1.25,
  B: 1.0,
};

export const TIER_COLOR: Record<string, string> = {
  'A+': 'var(--purple)',
  A: 'var(--accent)',
  B: 'var(--long)',
  C: 'var(--warn)',
};

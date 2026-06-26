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
  revealIdentities: ['CIO'],
  approveTrades: ['CIO', 'PM'],
  adjustAllocations: ['CIO', 'PM'],
  viewPortfolio: ['CIO', 'PM'],
  viewAnalystPerf: ['CIO', 'PM'],
  submitIdeas: ['CIO', 'PM'],
  vote: ['CIO', 'PM'],
};

export const can = (user: User | null, p: Permission): boolean => {
  if (!user) return false;
  if (user.role === 'CIO') return true;
  return PERM[p]?.includes(user.role) ?? false;
};

export const ROLE_COLOR: Record<string, string> = {
  CIO: 'var(--purple)',
  PM: 'var(--accent)',
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

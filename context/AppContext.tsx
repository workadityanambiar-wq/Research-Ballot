'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import type { Idea, PortfolioPosition, VoteMap, Allocation } from '@/lib/types';
import { PORT0, VOTES0, WEEK_ID } from '@/lib/data';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  legacyId: string;
  title: string;
  role: string;
  tier: string;
  mfaEnabled: boolean;
}

interface AppState {
  user: AuthUser | null;
  sessionLoading: boolean;
  ideas: Idea[];
  portfolio: PortfolioPosition[];
  votes: VoteMap;
  allocations: Allocation[];
  setPortfolio: (fn: (prev: PortfolioPosition[]) => PortfolioPosition[]) => void;
  setVotes: (v: VoteMap) => void;
  submitRound: (entries: Array<{ ideaId: string; amount: number }>, round: 1 | 2) => Promise<void>;
  refreshIdeas: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [ideas, setIdeasState] = useState<Idea[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(PORT0);
  const [votes, setVotes] = useState<VoteMap>(VOTES0);
  const [allocations, setAllocationsState] = useState<Allocation[]>([]);
  const router = useRouter();

  const refreshIdeas = useCallback(async () => {
    try {
      const data = await fetch(`/api/ideas?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      setIdeasState(data);
    } catch { /* DB not reachable */ }
  }, []);

  const refreshAllocations = useCallback(async () => {
    try {
      const data = await fetch(`/api/allocations?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      setAllocationsState(data);
    } catch { /* DB not reachable */ }
  }, []);

  // Load on mount (once session is ready)
  useEffect(() => {
    if (status === 'authenticated') {
      refreshIdeas();
      refreshAllocations();
    }
  }, [status, refreshIdeas, refreshAllocations]);

  const submitRound = useCallback(async (entries: Array<{ ideaId: string; amount: number }>, round: 1 | 2) => {
    const res = await fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocations: entries, round, weekId: WEEK_ID }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? 'Failed to submit ballot');
    }
    await Promise.all([refreshIdeas(), refreshAllocations()]);
  }, [refreshIdeas, refreshAllocations]);

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        displayName: (session.user as AuthUser).displayName ?? session.user.name ?? '',
        legacyId: (session.user as AuthUser).legacyId ?? '',
        title: (session.user as AuthUser).title ?? '',
        role: (session.user as AuthUser).role ?? '',
        tier: (session.user as AuthUser).tier ?? '',
        mfaEnabled: (session.user as AuthUser).mfaEnabled ?? false,
      }
    : null;

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <AppContext.Provider value={{ user, sessionLoading: status === 'loading', ideas, portfolio, votes, allocations, setPortfolio, setVotes, submitRound, refreshIdeas, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

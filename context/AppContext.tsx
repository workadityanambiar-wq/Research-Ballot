'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Idea, PortfolioPosition, VoteMap, Allocation, GamingFlag } from '@/lib/types';
import { USERS, IDEAS0, PORT0, VOTES0, WEEK_ID } from '@/lib/data';
import { applyScores } from '@/lib/scoring';
import { runGamingEngine, integrityScore } from '@/lib/gaming';
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
  gamingFlags: GamingFlag[];
  votingIntegrity: number;
  setPortfolio: (fn: (prev: PortfolioPosition[]) => PortfolioPosition[]) => void;
  setVotes: (v: VoteMap) => void;
  submitRound: (entries: Array<{ ideaId: string; amount: number }>, round: 1 | 2) => Promise<void>;
  refreshIdeas: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rawIdeas, setRawIdeas] = useState<Idea[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(PORT0);
  const [votes, setVotes] = useState<VoteMap>(VOTES0);
  const [allocations, setAllocationsState] = useState<Allocation[]>([]);
  const [gamingFlags, setGamingFlags] = useState<GamingFlag[]>([]);
  const [votingIntegrity, setVotingIntegrity] = useState(100);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: AuthUser | null) => {
        setUser(data);
        setSessionLoading(false);
      })
      .catch(() => {
        setUser(null);
        setSessionLoading(false);
      });
  }, []);

  const refreshIdeas = useCallback(async () => {
    try {
      const data = await fetch(`/api/ideas?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      setRawIdeas(data.length ? data : IDEAS0);
    } catch { setRawIdeas(IDEAS0); }
  }, []);

  const refreshAllocations = useCallback(async () => {
    try {
      const data = await fetch(`/api/allocations?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      setAllocationsState(data);
    } catch { /* DB not reachable */ }
  }, []);

  useEffect(() => {
    if (user) {
      refreshIdeas();
      refreshAllocations();
    }
  }, [user, refreshIdeas, refreshAllocations]);

  useEffect(() => {
    const baseIdeas = rawIdeas.length ? rawIdeas : IDEAS0;
    const liveVotes: VoteMap = allocations.reduce<VoteMap>((vm, a) => {
      if (!vm[a.ideaId]) vm[a.ideaId] = {};
      vm[a.ideaId][a.userId] = (vm[a.ideaId][a.userId] ?? 0) + a.amount;
      return vm;
    }, {});
    const effectiveVotes = Object.keys(liveVotes).length ? liveVotes : VOTES0;
    setIdeas(applyScores(baseIdeas, effectiveVotes, USERS));
    const ideaAuthor: Record<string, string> = {};
    for (const idea of baseIdeas) ideaAuthor[idea.id] = idea.authorId;
    const flags = runGamingEngine(effectiveVotes, ideaAuthor);
    setGamingFlags(flags);
    const uniqueVoters = new Set<string>();
    for (const v of Object.values(effectiveVotes)) for (const id of Object.keys(v)) uniqueVoters.add(id);
    setVotingIntegrity(integrityScore(flags, uniqueVoters.size));
  }, [rawIdeas, allocations]);

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

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AppContext.Provider value={{ user, sessionLoading, ideas, portfolio, votes, allocations, gamingFlags, votingIntegrity, setPortfolio, setVotes, submitRound, refreshIdeas, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

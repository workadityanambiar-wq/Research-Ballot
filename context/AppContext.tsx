'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, Idea, PortfolioPosition, VoteMap, Allocation, GamingFlag } from '@/lib/types';
import { IDEAS0, VOTES0, WEEK_ID } from '@/lib/data';
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
  users: User[];
  dataLoading: boolean;
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
  refreshPortfolio: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [rawIdeas, setRawIdeas] = useState<Idea[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
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

  const refreshUsers = useCallback(async () => {
    try {
      const data = await fetch('/api/users').then(r => r.ok ? r.json() : []);
      if (Array.isArray(data) && data.length > 0) setUsers(data);
    } catch { /* keep [] */ }
  }, []);

  const refreshIdeas = useCallback(async () => {
    try {
      const data = await fetch(`/api/ideas?weekId=${WEEK_ID}&withSnapshot=1`).then(r => r.ok ? r.json() : []);
      setRawIdeas(data.length ? data : IDEAS0);
    } catch { setRawIdeas(IDEAS0); }
  }, []);

  const refreshAllocations = useCallback(async () => {
    try {
      const data = await fetch(`/api/allocations?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      setAllocationsState(data);
    } catch { /* DB not reachable */ }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    try {
      const data = await fetch(`/api/portfolio?weekId=${WEEK_ID}`).then(r => r.ok ? r.json() : []);
      if (Array.isArray(data) && data.length > 0) setPortfolio(data);
    } catch { /* keep current */ }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([
        refreshIdeas(),
        refreshAllocations(),
        refreshUsers(),
        refreshPortfolio(),
      ]).finally(() => setDataLoading(false));
    } else if (!sessionLoading) {
      setDataLoading(false);
    }
  }, [user, sessionLoading, refreshIdeas, refreshAllocations, refreshUsers, refreshPortfolio]);

  // Auto-refresh: ideas + allocations every 2 min, portfolio every 5 min
  useEffect(() => {
    if (!user) return;
    const ideasId = setInterval(() => { refreshIdeas(); refreshAllocations(); }, 2 * 60 * 1000);
    return () => clearInterval(ideasId);
  }, [user, refreshIdeas, refreshAllocations]);

  useEffect(() => {
    if (!user) return;
    const portfolioId = setInterval(refreshPortfolio, 5 * 60 * 1000);
    return () => clearInterval(portfolioId);
  }, [user, refreshPortfolio]);

  useEffect(() => {
    if (users.length === 0) return;
    const baseIdeas = rawIdeas.length ? rawIdeas : IDEAS0;
    const liveVotes: VoteMap = allocations.reduce<VoteMap>((vm, a) => {
      if (!vm[a.ideaId]) vm[a.ideaId] = {};
      vm[a.ideaId][a.userId] = (vm[a.ideaId][a.userId] ?? 0) + a.amount;
      return vm;
    }, {});
    const effectiveVotes = Object.keys(liveVotes).length ? liveVotes : VOTES0;
    setIdeas(applyScores(baseIdeas, effectiveVotes, users));
    const ideaAuthor: Record<string, string> = {};
    for (const idea of baseIdeas) ideaAuthor[idea.id] = idea.authorId;
    const flags = runGamingEngine(effectiveVotes, ideaAuthor);
    setGamingFlags(flags);
    const uniqueVoters = new Set<string>();
    for (const v of Object.values(effectiveVotes)) for (const id of Object.keys(v)) uniqueVoters.add(id);
    setVotingIntegrity(integrityScore(flags, uniqueVoters.size));
  }, [rawIdeas, allocations, users]);

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
    <AppContext.Provider value={{
      user, sessionLoading, users, dataLoading,
      ideas, portfolio, votes, allocations, gamingFlags, votingIntegrity,
      setPortfolio, setVotes, submitRound, refreshIdeas, refreshPortfolio, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

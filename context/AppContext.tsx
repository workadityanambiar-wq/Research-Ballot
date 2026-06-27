'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import type { Idea, PortfolioPosition, VoteMap, Allocation } from '@/lib/types';
import { IDEAS0, PORT0, VOTES0, ALLOCATIONS0 } from '@/lib/data';
import { useRouter } from 'next/navigation';

// The auth user shape from Auth.js session
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
  setIdeas: (fn: (prev: Idea[]) => Idea[]) => void;
  setPortfolio: (fn: (prev: PortfolioPosition[]) => PortfolioPosition[]) => void;
  setVotes: (v: VoteMap) => void;
  submitRound: (newAllocs: Allocation[]) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [ideas, setIdeas] = useState<Idea[]>(IDEAS0);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(PORT0);
  const [votes, setVotes] = useState<VoteMap>(VOTES0);
  const [allocations, setAllocations] = useState<Allocation[]>(ALLOCATIONS0);
  const router = useRouter();

  const submitRound = (newAllocs: Allocation[]) => {
    setAllocations(prev => [...prev, ...newAllocs]);
  };

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
    <AppContext.Provider value={{ user, sessionLoading: status === 'loading', ideas, portfolio, votes, allocations, setIdeas, setPortfolio, setVotes, submitRound, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

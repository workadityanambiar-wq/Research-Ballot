'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Idea, PortfolioPosition, VoteMap } from '@/lib/types';
import { IDEAS0, PORT0, VOTES0 } from '@/lib/data';
import { getSession, clearSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AppState {
  user: User | null;
  ideas: Idea[];
  portfolio: PortfolioPosition[];
  votes: VoteMap;
  setUser: (u: User | null) => void;
  setIdeas: (fn: (prev: Idea[]) => Idea[]) => void;
  setPortfolio: (fn: (prev: PortfolioPosition[]) => PortfolioPosition[]) => void;
  setVotes: (v: VoteMap) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>(IDEAS0);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(PORT0);
  const [votes, setVotes] = useState<VoteMap>(VOTES0);
  const router = useRouter();

  useEffect(() => {
    const u = getSession();
    if (u) setUser(u);
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
    router.push('/login');
  };

  return (
    <AppContext.Provider value={{ user, ideas, portfolio, votes, setUser, setIdeas, setPortfolio, setVotes, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface DashboardKPIs {
  weekId: string;
  dataSource: 'live' | 'expected';
  activeAnalysts: number;
  totalAnalysts: number;
  ideasCount: number;
  approvedCount: number;
  portfolioReturnWtd: number | null;
  ytdReturn: number | null;
  sharpe: number | null;
  sectorAllocation: Array<{ sector: string; pct: number }>;
  performanceSeries: number[];
  lastUpdated: string;
}

export interface PortfolioAnalytics {
  tickers: string[];
  corrMatrix: number[][];
  volatility: number;
  sharpe: number | null;
  expectedReturn: number;
  dataSource: string;
  lastUpdated: string;
}

function usePoll<T>(url: string | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refresh = useCallback(() => {
    const u = urlRef.current;
    if (!u) return;
    fetch(u)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: T) => {
        setData(d);
        setError(false);
        setLastUpdated(new Date());
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!url) return;
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs, refresh]);

  return { data, loading, error, lastUpdated, refresh };
}

export function useDashboardKPIs(weekId: string) {
  return usePoll<DashboardKPIs>(`/api/dashboard/kpis?weekId=${encodeURIComponent(weekId)}`, 60_000);
}

export function usePortfolioAnalytics(weekId: string) {
  return usePoll<PortfolioAnalytics>(`/api/portfolio/analytics?weekId=${encodeURIComponent(weekId)}`, 300_000);
}

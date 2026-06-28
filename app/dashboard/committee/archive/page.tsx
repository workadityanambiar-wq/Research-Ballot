'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ArchivedIdea = {
  id: string; ticker: string; dir: string; finalScore: number | null;
  approvalStatus: string; createdAt: string; updatedAt: string;
  challengeCount: number; openChallenges: number; questionCount: number; voteCount: number;
  researchDoc: { id: string; overview: string | null; authorId: string } | null;
  allocationQueue: { id: string; rank: number | null; status: string } | null;
};
type Response = { total: number; page: number; pageSize: number; ideas: ArchivedIdea[] };

export default function ArchivePage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (dirFilter !== 'ALL') params.set('dir', dirFilter);
    if (search) params.set('q', search);
    const res = await fetch(`/api/committee/archive?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [page, statusFilter, dirFilter, search]);

  useEffect(() => { setPage(1); }, [statusFilter, dirFilter, search]);
  useEffect(() => { load(); }, [load]);

  const STATUS_COLOR: Record<string, string> = {
    APPROVED: 'badge-long',
    REJECTED: 'badge-short',
    APPROVED_WITH_CONDITIONS: 'badge-warn',
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decision Archive</h1>
          <p className="text-[var(--text3)] text-sm mt-0.5">All concluded investment committee decisions</p>
        </div>
        <Link href="/dashboard/committee" className="btn btn-ghost btn-sm">← Committee</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticker…"
          className="inp w-40 text-sm" />
        <div className="flex gap-1">
          {['ALL', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s === 'ALL' ? 'All' : s === 'APPROVED_WITH_CONDITIONS' ? 'Conditional' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['ALL', 'LONG', 'SHORT'].map(d => (
            <button key={d} onClick={() => setDirFilter(d)}
              className={`btn btn-sm ${dirFilter === d ? 'btn-primary' : 'btn-ghost'}`}>
              {d === 'ALL' ? 'Both' : d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-[var(--text3)]">Loading…</div>
      ) : !data || data.ideas.length === 0 ? (
        <div className="panel p-12 text-center text-[var(--text4)]">No archived decisions found</div>
      ) : (
        <>
          <div className="text-xs text-[var(--text4)]">{data.total} decisions</div>
          <div className="space-y-2">
            {data.ideas.map(idea => (
              <div key={idea.id} className="panel p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/dashboard/committee/${idea.id}`}
                      className="font-mono font-bold hover:text-[var(--accent)]">{idea.ticker}</Link>
                    <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>{idea.dir}</span>
                    <span className={`badge ${STATUS_COLOR[idea.approvalStatus] ?? 'badge-dim'}`}>
                      {idea.approvalStatus === 'APPROVED_WITH_CONDITIONS' ? 'Conditional' : idea.approvalStatus}
                    </span>
                    {idea.allocationQueue && (
                      <span className="badge badge-accent">In Queue #{idea.allocationQueue.rank ?? '—'}</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text3)]">
                    Score: <span className="font-mono">{idea.finalScore?.toFixed(1) ?? '—'}</span>
                    {' · '}{idea.voteCount} votes · {idea.questionCount} questions · {idea.challengeCount} challenges
                    {idea.openChallenges > 0 && <span className="text-[var(--warn)]"> ({idea.openChallenges} open)</span>}
                    {' · '}{new Date(idea.updatedAt).toLocaleDateString()}
                  </div>
                  {idea.researchDoc?.overview && (
                    <div className="text-xs text-[var(--text4)] mt-1 truncate">{idea.researchDoc.overview}</div>
                  )}
                </div>
                <Link href={`/dashboard/committee/${idea.id}`} className="btn btn-ghost btn-sm shrink-0">View</Link>
              </div>
            ))}
          </div>

          {data.total > data.pageSize && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost btn-sm">
                ← Prev
              </button>
              <span className="text-sm text-[var(--text3)]">Page {page} of {Math.ceil(data.total / data.pageSize)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / data.pageSize)}
                className="btn btn-ghost btn-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

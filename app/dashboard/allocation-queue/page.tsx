'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type QueueEntry = {
  id: string; ideaId: string; rank: number | null; capitalRequested: number | null;
  recommendedAlloc: number | null; portfolioExposurePct: number | null;
  riskRating: string; notes: string | null; status: string;
  updatedBy: string | null; createdAt: string; updatedAt: string;
  idea: {
    id: string; ticker: string; dir: string; finalScore: number | null;
    approvalStatus: string; pmScore: number | null;
    researchDoc: { overview: string | null } | null;
  } | null;
};

export default function AllocationQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedIdeas, setApprovedIdeas] = useState<{ id: string; ticker: string; dir: string; finalScore: number | null }[]>([]);
  const [addingIdea, setAddingIdea] = useState('');
  const [addingNotes, setAddingNotes] = useState('');
  const [addingCapital, setAddingCapital] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [qRes, iRes] = await Promise.all([
      fetch('/api/allocation-queue'),
      fetch('/api/ideas?status=APPROVED'),
    ]);
    const [q, i] = await Promise.all([qRes.json(), iRes.json()]);
    setEntries(Array.isArray(q) ? q : []);
    setApprovedIdeas(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addToQueue = async () => {
    if (!addingIdea) return;
    setAdding(true);
    await fetch(`/api/allocation-queue/${addingIdea}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', notes: addingNotes, capitalRequested: addingCapital ? Number(addingCapital) : undefined }),
    });
    setAddingIdea(''); setAddingNotes(''); setAddingCapital(''); setAdding(false);
    load();
  };

  const removeFromQueue = async (ideaId: string) => {
    await fetch(`/api/allocation-queue/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    });
    load();
  };

  const updateStatus = async (ideaId: string, status: string) => {
    await fetch(`/api/allocation-queue/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const queuedIdeaIds = new Set(entries.map(e => e.ideaId));
  const availableIdeas = approvedIdeas.filter(i => !queuedIdeaIds.has(i.id));

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Allocation Queue</h1>
          <p className="text-[var(--text3)] text-sm mt-0.5">Approved ideas awaiting capital deployment</p>
        </div>
        <Link href="/dashboard/committee" className="btn btn-ghost btn-sm">← Committee</Link>
      </div>

      {/* Add to queue */}
      {availableIdeas.length > 0 && (
        <div className="panel p-4">
          <div className="sec-title mb-3">Add to Queue</div>
          <div className="flex flex-wrap gap-2">
            <select value={addingIdea} onChange={e => setAddingIdea(e.target.value)} className="inp flex-1 min-w-48 text-sm">
              <option value="">Select approved idea…</option>
              {availableIdeas.map(i => (
                <option key={i.id} value={i.id}>
                  {i.ticker} ({i.dir}) — Score: {i.finalScore?.toFixed(1) ?? '—'}
                </option>
              ))}
            </select>
            <input value={addingCapital} onChange={e => setAddingCapital(e.target.value)} placeholder="Capital requested $"
              className="inp w-36 text-sm" type="number" />
            <input value={addingNotes} onChange={e => setAddingNotes(e.target.value)} placeholder="Notes (optional)"
              className="inp flex-1 text-sm" />
            <button onClick={addToQueue} disabled={adding || !addingIdea} className="btn btn-primary btn-sm">
              Add
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[var(--text3)]">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="panel p-12 text-center text-[var(--text4)]">
          No ideas in allocation queue. Add approved ideas above.
        </div>
      ) : (
        <div className="panel">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th className="w-10">Rank</th>
                <th>Idea</th>
                <th>Score</th>
                <th>Capital</th>
                <th>Risk</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(entry => (
                <tr key={entry.id}>
                  <td className="font-mono text-[var(--text4)] text-center">{entry.rank ?? '—'}</td>
                  <td>
                    {entry.idea ? (
                      <div>
                        <Link href={`/dashboard/committee/${entry.ideaId}`}
                          className="font-mono font-bold hover:text-[var(--accent)]">
                          {entry.idea.ticker}
                        </Link>
                        <span className={`badge ml-2 ${entry.idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {entry.idea.dir}
                        </span>
                        {entry.notes && (
                          <div className="text-xs text-[var(--text4)] truncate max-w-48 mt-0.5">{entry.notes}</div>
                        )}
                      </div>
                    ) : <span className="text-[var(--text4)]">—</span>}
                  </td>
                  <td className="font-mono">
                    {entry.idea?.finalScore?.toFixed(1) ?? '—'}
                    <div className="text-xs text-[var(--text4)]">
                      PM {entry.idea?.pmScore?.toFixed(1) ?? '—'}
                    </div>
                  </td>
                  <td className="font-mono text-sm">
                    {entry.capitalRequested ? `$${entry.capitalRequested.toLocaleString()}` : '—'}
                    {entry.portfolioExposurePct && (
                      <div className="text-xs text-[var(--text4)]">{entry.portfolioExposurePct.toFixed(1)}% AUM</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      entry.riskRating === 'HIGH' ? 'badge-short' :
                      entry.riskRating === 'LOW' ? 'badge-long' : 'badge-warn'
                    }`}>{entry.riskRating}</span>
                  </td>
                  <td>
                    <select value={entry.status}
                      onChange={e => updateStatus(entry.ideaId, e.target.value)}
                      className="inp text-xs py-0.5 px-1">
                      {['PENDING', 'IN_PROGRESS', 'ALLOCATED', 'ON_HOLD', 'CANCELLED'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link href={`/dashboard/trades?ideaId=${entry.ideaId}`} className="btn btn-ghost btn-sm">
                        Trade
                      </Link>
                      <button onClick={() => removeFromQueue(entry.ideaId)}
                        className="btn btn-danger btn-sm">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

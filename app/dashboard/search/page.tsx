'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface SearchResults {
  ideas: Array<{ id: string; ticker: string; dir: string; thesis: string; approvalStatus: string; authorId: string; finalScore: number }>;
  research: Array<{ id: string; ideaId: string; status: string; ticker: string; dir: string; completionScore: number; qualityScore: number; updatedAt: string }>;
  comments: Array<{ id: string; docId: string; ideaId: string; ticker: string; content: string; authorId: string; createdAt: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'badge-low', PENDING: 'badge-warn', REVIEW: 'badge-accent', REJECTED: 'badge-dim',
};

export default function SearchPage() {
  const { user } = useApp();
  const { cols } = useBreakpoint();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setResults(data);
    } catch { setResults(null); }
    setLoading(false);
  }, []);

  const total = results ? results.ideas.length + results.research.length + results.comments.length : 0;

  if (!user) return null;

  return (
    <div className="scroll-y dash-content" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search header */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Institutional Search</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>Search across ideas, research documents, and committee discussions</p>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 10, maxWidth: 700 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)', fontSize: 14 }}>⌕</span>
          <input
            className="inp"
            placeholder="Search ideas, tickers, thesis, committee discussions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(query); }}
            style={{ paddingLeft: 32, fontSize: 14 }}
            autoFocus
          />
        </div>
        <button className="btn btn-primary" onClick={() => doSearch(query)} disabled={loading || query.length < 2}>
          {loading ? 'SEARCHING…' : 'SEARCH'}
        </button>
      </div>

      {/* Results */}
      {!searched && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 12, maxWidth: 700 }}>
          {[
            { icon: '⬡', label: 'Research Docs', desc: 'Search across all research workspaces' },
            { icon: '✦', label: 'Investment Ideas', desc: 'Find ideas by ticker, thesis, or analyst' },
            { icon: '◈', label: 'Committee Discussions', desc: 'Search meeting notes and comments' },
          ].map(t => (
            <div key={t.label} className="panel2" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>SEARCHING…</div>
      )}

      {searched && !loading && results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {total} result{total !== 1 ? 's' : ''} for "{query}"
          </div>

          {/* Ideas */}
          {results.ideas.length > 0 && (
            <div>
              <div className="sec-title" style={{ marginBottom: 10 }}>Investment Ideas · {results.ideas.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.ideas.map(idea => (
                  <Link key={idea.id} href={`/dashboard/research/${idea.id}`} style={{ textDecoration: 'none' }}>
                    <div className="panel" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{idea.ticker}</span>
                        <span className={`badge badge-${idea.dir === 'LONG' ? 'long' : 'short'}`} style={{ marginLeft: 6 }}>{idea.dir}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="line-clamp-3" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{idea.thesis}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                          <span className={`badge ${STATUS_BADGE[idea.approvalStatus] ?? 'badge-dim'}`}>{idea.approvalStatus}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{idea.id}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>by {idea.authorId}</span>
                          <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Score {idea.finalScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }}>Open Workspace →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Research docs */}
          {results.research.length > 0 && (
            <div>
              <div className="sec-title" style={{ marginBottom: 10 }}>Research Documents · {results.research.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.research.map(doc => (
                  <Link key={doc.id} href={`/dashboard/research/${doc.ideaId}`} style={{ textDecoration: 'none' }}>
                    <div className="panel" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{doc.ticker}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-dim">{doc.status.replace('_', ' ')}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>Completion {doc.completionScore}%</span>
                          <span style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--mono)' }}>QS {doc.qualityScore}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>
                          Updated {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--accent)' }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {results.comments.length > 0 && (
            <div>
              <div className="sec-title" style={{ marginBottom: 10 }}>Committee Discussions · {results.comments.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.comments.map(c => (
                  <Link key={c.id} href={`/dashboard/research/${c.ideaId}?tab=Committee`} style={{ textDecoration: 'none' }}>
                    <div className="panel" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{c.ticker}</span>
                        <span style={{ fontSize: 10, color: 'var(--text4)' }}>by {c.authorId}</span>
                        <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{c.content}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⌕</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No results found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term or ticker symbol</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

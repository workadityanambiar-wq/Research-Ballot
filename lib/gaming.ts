import type { GamingFlag, VoteMap } from './types';

const SEV_HIGH = 70;
const SEV_MED = 50;

function sev(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= SEV_HIGH) return 'HIGH';
  if (score >= SEV_MED) return 'MEDIUM';
  return 'LOW';
}

function voterAllocations(voteMap: VoteMap): Record<string, Record<string, number>> {
  const byVoter: Record<string, Record<string, number>> = {};
  for (const [ideaId, votes] of Object.entries(voteMap)) {
    for (const [voterId, credits] of Object.entries(votes)) {
      if (!byVoter[voterId]) byVoter[voterId] = {};
      byVoter[voterId][ideaId] = (byVoter[voterId][ideaId] ?? 0) + credits;
    }
  }
  return byVoter;
}

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) dot += (a[k] ?? 0) * (b[k] ?? 0);
  for (const v of Object.values(a)) na += v * v;
  for (const v of Object.values(b)) nb += v * v;
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type RawFlag = Omit<GamingFlag, 'id'>;

export function detectConcentration(voteMap: VoteMap, threshold = 0.60): RawFlag[] {
  const byVoter = voterAllocations(voteMap);
  const shares = Object.values(byVoter).map(allocs => {
    const tot = Object.values(allocs).reduce((a, b) => a + b, 0) || 1;
    return Math.max(...Object.values(allocs)) / tot;
  });
  const peerMed = median(shares);

  const flags: RawFlag[] = [];
  for (const [voter, allocs] of Object.entries(byVoter)) {
    const tot = Object.values(allocs).reduce((a, b) => a + b, 0) || 1;
    const topIdea = Object.entries(allocs).reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
    const share = allocs[topIdea] / tot;
    if (share >= threshold) {
      const score = Math.min(100, Math.round(share * 100));
      flags.push({
        type: 'VOTE_CONCENTRATION',
        sev: sev(score),
        users: [voter],
        detail: `${Math.round(share * 100)}% of weekly credits allocated to single idea ${topIdea}. Peer median: ${Math.round(peerMed * 100)}%.`,
        score,
        ts: new Date().toISOString(),
      });
    }
  }
  return flags;
}

export function detectReciprocal(
  voteMap: VoteMap,
  ideaAuthor: Record<string, string>,
  history: VoteMap[] = [],
  minCredits = 150,
  minSymmetry = 0.50,
  minShare = 0.15,
): RawFlag[] {
  function directedSupport(vm: VoteMap): Record<string, number> {
    const support: Record<string, number> = {};
    for (const [ideaId, votes] of Object.entries(vm)) {
      const author = ideaAuthor[ideaId];
      if (!author) continue;
      for (const [voter, credits] of Object.entries(votes)) {
        if (voter !== author) {
          const key = `${voter}::${author}`;
          support[key] = (support[key] ?? 0) + credits;
        }
      }
    }
    return support;
  }

  const cur = directedSupport(voteMap);
  const byVoter = voterAllocations(voteMap);
  const budget: Record<string, number> = {};
  for (const [v, allocs] of Object.entries(byVoter)) {
    budget[v] = Object.values(allocs).reduce((a, b) => a + b, 0);
  }

  const voters = [...new Set([...Object.keys(cur).map(k => k.split('::')[0]), ...Object.keys(cur).map(k => k.split('::')[1])])].sort();

  const flags: RawFlag[] = [];
  for (let i = 0; i < voters.length; i++) {
    for (let j = i + 1; j < voters.length; j++) {
      const a = voters[i], b = voters[j];
      const ab = cur[`${a}::${b}`] ?? 0;
      const ba = cur[`${b}::${a}`] ?? 0;
      if (ab < minCredits || ba < minCredits) continue;
      const mutual = Math.min(ab, ba) / Math.max(ab, ba);
      if (mutual < minSymmetry) continue;
      const shareA = ab / (budget[a] || 1);
      const shareB = ba / (budget[b] || 1);
      if (Math.min(shareA, shareB) < minShare) continue;

      const historySup = history.map(h => directedSupport(h));
      const weeksBidir = 1 + historySup.filter(h => (h[`${a}::${b}`] ?? 0) > 0 && (h[`${b}::${a}`] ?? 0) > 0).length;
      const totalWeeks = 1 + history.length;
      const ratio = weeksBidir / totalWeeks;
      const score = Math.min(100, Math.round((0.6 * ratio + 0.4 * mutual) * 100));
      flags.push({
        type: 'RECIPROCAL_VOTING',
        sev: sev(score),
        users: [a, b],
        detail: `Mutual voting pattern: ${weeksBidir}/${totalWeeks} weeks bidirectional. Symmetry coefficient ${mutual.toFixed(2)}.`,
        score,
        ts: new Date().toISOString(),
      });
    }
  }
  return flags;
}

export function detectRings(voteMap: VoteMap, simThreshold = 0.92): RawFlag[] {
  const byVoter = voterAllocations(voteMap);
  const voters = Object.keys(byVoter).sort();
  const adj: Record<string, Set<string>> = {};
  const sims: Record<string, number> = {};
  for (const v of voters) adj[v] = new Set();

  for (let i = 0; i < voters.length; i++) {
    for (let j = i + 1; j < voters.length; j++) {
      const a = voters[i], b = voters[j];
      const s = cosine(byVoter[a], byVoter[b]);
      if (s >= simThreshold) {
        adj[a].add(b);
        adj[b].add(a);
        sims[`${a}::${b}`] = s;
      }
    }
  }

  const flags: RawFlag[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < voters.length; i++) {
    for (let j = i + 1; j < voters.length; j++) {
      for (let k = j + 1; k < voters.length; k++) {
        const a = voters[i], b = voters[j], c = voters[k];
        if (adj[a].has(b) && adj[a].has(c) && adj[b].has(c)) {
          const key = [a, b, c].sort().join('::');
          if (seen.has(key)) continue;
          seen.add(key);
          const getSim = (x: string, y: string) => sims[`${x}::${y}`] ?? sims[`${y}::${x}`] ?? 0;
          const avgSim = (getSim(a, b) + getSim(a, c) + getSim(b, c)) / 3;
          const score = Math.min(100, Math.round(avgSim * 100));
          flags.push({
            type: 'VOTING_RING',
            sev: sev(score),
            users: [a, b, c].sort(),
            detail: `Triangular mutual-support network detected. Mean voting similarity ${Math.round(avgSim * 100)}%.`,
            score,
            ts: new Date().toISOString(),
          });
        }
      }
    }
  }
  return flags;
}

export function detectFavoritism(
  voteMap: VoteMap,
  ideaAuthor: Record<string, string>,
  overFactor = 2.5,
): RawFlag[] {
  const byPair: Record<string, Record<string, number>> = {};
  for (const [ideaId, votes] of Object.entries(voteMap)) {
    const author = ideaAuthor[ideaId];
    if (!author) continue;
    for (const [voter, credits] of Object.entries(votes)) {
      if (voter !== author) {
        if (!byPair[voter]) byPair[voter] = {};
        byPair[voter][author] = (byPair[voter][author] ?? 0) + credits;
      }
    }
  }

  const flags: RawFlag[] = [];
  for (const [voter, authors] of Object.entries(byPair)) {
    const vals = Object.values(authors);
    if (vals.length < 2) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    for (const [author, credits] of Object.entries(authors)) {
      if (avg > 0 && credits >= overFactor * avg) {
        const ratio = credits / avg;
        const score = Math.min(100, Math.round(Math.min(ratio / 4.0, 1.0) * 100));
        flags.push({
          type: 'ANALYST_FAVORITISM',
          sev: sev(score),
          users: [voter, author],
          detail: `${voter} allocated ${Math.round(ratio * 100)}% of their per-author average to ${author}'s ideas.`,
          score,
          ts: new Date().toISOString(),
        });
      }
    }
  }
  return flags;
}

export function runGamingEngine(
  voteMap: VoteMap,
  ideaAuthor: Record<string, string>,
  history: VoteMap[] = [],
): GamingFlag[] {
  const raw: RawFlag[] = [
    ...detectConcentration(voteMap),
    ...detectReciprocal(voteMap, ideaAuthor, history),
    ...detectRings(voteMap),
    ...detectFavoritism(voteMap, ideaAuthor),
  ];
  raw.sort((a, b) => b.score - a.score);
  return raw.map((f, i) => ({ ...f, id: `G-${String(i + 1).padStart(3, '0')}` }));
}

export function integrityScore(flags: GamingFlag[], nVoters: number): number {
  if (!flags.length) return 100;
  const penalty = flags.reduce((s, f) => s + f.score, 0) / Math.max(nVoters, 1);
  return Math.max(0, Math.round((100 - penalty) * 10) / 10);
}

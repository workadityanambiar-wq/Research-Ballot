import type { Idea, User, VoteMap } from './types';

export const TIER_WEIGHT: Record<string, number> = { 'A+': 1.5, A: 1.25, B: 1.0, C: 0.75 };
export const CREDIT_SCHEDULE = [900, 700, 500];
export const WEEKLY_CREDIT_BUDGET = 1000;
export const FINAL_WEIGHTS = { pm: 0.3, skill: 0.25, rr: 0.2, quant: 0.25 };
export const QUANT_WEIGHTS = { momentum: 0.4, rs: 0.35, earningRev: 0.25 };

const clip = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function tierWeightedCredits(votesForIdea: Record<string, number>, userTier: Record<string, string>): number {
  return Object.entries(votesForIdea).reduce(
    (sum, [voter, cr]) => sum + cr * (TIER_WEIGHT[userTier[voter] ?? 'B'] ?? 1),
    0,
  );
}

export function pmScoresFromVotes(votes: VoteMap, userTier: Record<string, string>): Record<string, number> {
  const weighted: Record<string, number> = {};
  for (const [iid, v] of Object.entries(votes)) weighted[iid] = tierWeightedCredits(v, userTier);
  const top = Math.max(...Object.values(weighted), 1);
  const out: Record<string, number> = {};
  for (const [iid, w] of Object.entries(weighted)) out[iid] = clip(95 * (w / top));
  return out;
}

export function skillScore(author: User): number {
  const sharpeNorm = clip((author.sharpe / 2.5) * 100);
  const raw = 0.35 * author.hitRate + 0.3 * sharpeNorm + 0.2 * author.drawCtrl + 0.15 * author.consistency;
  const tierW = TIER_WEIGHT[author.tier] ?? 1;
  return clip(raw * (0.8 + 0.2 * (tierW / 1.5)));
}

export function rrScore(idea: Idea): number {
  const { entry, stop, target, dir } = idea;
  let calcRR: number;
  if (entry && stop && target) {
    const [reward, risk] = dir === 'LONG' ? [target - entry, entry - stop] : [entry - target, stop - entry];
    calcRR = risk > 0 ? reward / risk : 0;
  } else calcRR = idea.rr ?? 0;
  const rrNorm = clip((calcRR / 3) * 100);
  const payoff = idea.expRet / (Math.abs(idea.expDD) || 1);
  const payoffNorm = clip((payoff / 3) * 100);
  const convNorm = clip((idea.conv / 10) * 100);
  return clip(0.45 * rrNorm + 0.35 * payoffNorm + 0.2 * convNorm);
}

export function quantScore(idea: Idea): number {
  return clip(
    QUANT_WEIGHTS.momentum * idea.momentumScore +
    QUANT_WEIGHTS.rs * idea.rsScore +
    QUANT_WEIGHTS.earningRev * idea.earningRevScore,
  );
}

export interface Scored {
  id: string;
  pmScore: number;
  skillScore: number;
  rrScore: number;
  quantScore: number;
  finalScore: number;
  totalCredits: number;
  rawCredits: number;
  rank: number;
}

export function scoreIdeas(ideas: Idea[], votes: VoteMap, users: User[]): Scored[] {
  const userTier: Record<string, string> = {};
  const userById: Record<string, User> = {};
  for (const u of users) { userTier[u.id] = u.tier; userById[u.id] = u; }
  const pm = pmScoresFromVotes(votes, userTier);

  const out: Scored[] = ideas.map((idea) => {
    const v = votes[idea.id] ?? {};
    const author = userById[idea.authorId];
    const sPm = pm[idea.id] ?? 0;
    const sSkill = author ? skillScore(author) : 0;
    const sRr = rrScore(idea);
    const sQuant = quantScore(idea);
    const final = FINAL_WEIGHTS.pm * sPm + FINAL_WEIGHTS.skill * sSkill + FINAL_WEIGHTS.rr * sRr + FINAL_WEIGHTS.quant * sQuant;
    return {
      id: idea.id,
      pmScore: sPm,
      skillScore: sSkill,
      rrScore: sRr,
      quantScore: sQuant,
      finalScore: clip(final),
      totalCredits: tierWeightedCredits(v, userTier),
      rawCredits: Object.values(v).reduce((a, b) => a + b, 0),
      rank: 0,
    };
  });

  out.sort((a, b) => b.finalScore - a.finalScore);
  out.forEach((s, i) => (s.rank = i + 1));
  return out;
}

export function applyScores(ideas: Idea[], votes: VoteMap, users: User[]): Idea[] {
  const scored = new Map(scoreIdeas(ideas, votes, users).map((s) => [s.id, s]));
  return ideas
    .map((idea) => {
      const s = scored.get(idea.id);
      if (!s) return idea;
      return {
        ...idea,
        pmScore: +s.pmScore.toFixed(1),
        skillScore: +s.skillScore.toFixed(1),
        rrScore: +s.rrScore.toFixed(1),
        quantScore: +s.quantScore.toFixed(1),
        finalScore: +s.finalScore.toFixed(1),
        totalCredits: Math.round(s.totalCredits),
        rank: s.rank,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

/** Compat shim used by /api/ideas route at submission time (no live votes yet). */
export function computeScores(params: {
  conv: number; expRet: number; rr: number;
  authorIdeaScore: number; totalCredits: number; maxCreditsAnyIdea: number;
}) {
  const { conv, expRet, rr, authorIdeaScore, totalCredits, maxCreditsAnyIdea } = params;
  const pmScore = maxCreditsAnyIdea > 0 ? (totalCredits / maxCreditsAnyIdea) * 100 : 0;
  const rrScoreVal = clip((rr / 3) * 100);
  const skill = authorIdeaScore;
  const quant = (conv / 10) * 60 + (Math.min(expRet, 30) / 30) * 40;
  const finalScore = pmScore * 0.40 + skill * 0.25 + rrScoreVal * 0.20 + quant * 0.15;
  return { pmScore, rrScore: rrScoreVal, skillScore: skill, quantScore: quant, finalScore };
}

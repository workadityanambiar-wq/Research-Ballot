export function computeScores(params: {
  conv: number;
  expRet: number;
  rr: number;
  authorIdeaScore: number;
  totalCredits: number;
  maxCreditsAnyIdea: number;
}) {
  const { conv, expRet, rr, authorIdeaScore, totalCredits, maxCreditsAnyIdea } = params;
  const pmScore = maxCreditsAnyIdea > 0 ? (totalCredits / maxCreditsAnyIdea) * 100 : 0;
  const rrScore = Math.min(100, (rr / 3) * 100);
  const skillScore = authorIdeaScore;
  const quantScore = (conv / 10) * 60 + (Math.min(expRet, 30) / 30) * 40;
  const finalScore = pmScore * 0.40 + skillScore * 0.25 + rrScore * 0.20 + quantScore * 0.15;
  return { pmScore, rrScore, skillScore, quantScore, finalScore };
}

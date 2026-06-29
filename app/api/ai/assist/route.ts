import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-helpers';

type Action = 'draft' | 'improve' | 'concise' | 'expand' | 'tone' | 'grammar';

const DRAFTS: Record<string, string> = {
  executiveSummary: `[TICKER] presents a compelling [LONG/SHORT] opportunity with an estimated [X]% return over a [hold period] horizon. The investment is underpinned by [2-3 sentence overview of the core thesis]. We believe the market is currently mispricing [key factor] by an estimated [X]%, creating an attractive entry at current levels.

The primary drivers of our thesis are: (1) [Driver 1 — e.g., accelerating revenue growth driven by product cycle], (2) [Driver 2 — e.g., margin expansion from operating leverage], and (3) [Driver 3 — e.g., re-rating catalyst from upcoming event]. Combined, these factors support a price target of [TARGET] versus the current price of [ENTRY], representing [X]% upside with a stop at [STOP].

The principal risk to our view is [key risk]. We believe this risk is mitigated by [mitigation]. Our conviction level is [X]/10 with a risk/reward ratio of [RR]. We recommend initiating a [X]% position and will monitor [key metric] as the primary indicator of thesis progression.`,

  thesis: `BUSINESS OVERVIEW
[Ticker] is a [market cap]-sized [sector/industry] company that [core business description in 2-3 sentences]. The company operates [number] business segments: [Segment A], [Segment B], and [Segment C], contributing [X]%, [Y]%, and [Z]% of revenue respectively.

COMPETITIVE ADVANTAGE
The company's durable competitive advantages include: (1) [Moat 1 — e.g., network effects with X million users], (2) [Moat 2 — e.g., proprietary technology with X patents], and (3) [Moat 3 — e.g., switching costs evidenced by X% retention rate]. These advantages have driven [metric] above peers for [X] consecutive years.

MARKET MISPRICING
We believe the market is materially undervaluing [key asset/business segment] due to [reason — e.g., near-term earnings noise masking structural improvement]. Consensus estimates imply [X] earnings growth, but our analysis suggests [Y] is achievable based on [evidence]. This represents a [Z]% discount to intrinsic value.

STRUCTURAL TAILWINDS
[Ticker] is positioned to benefit from [macro trend 1] and [macro trend 2]. The total addressable market is growing at [X]% CAGR and is expected to reach $[Y]B by [year]. Management has demonstrated the ability to capture share, growing from [X]% to [Y]% over the past [Z] years.

UPCOMING CATALYSTS
The most important near-term catalyst is [event — e.g., Q3 earnings] expected on [date]. We anticipate [specific outcome] which should drive [market reaction]. Secondary catalysts include [Catalyst 2] and [Catalyst 3].

VALUATION SUPPORT
At [X]x [multiple — P/E, EV/EBITDA], [Ticker] trades at a [discount/premium] to peers averaging [Y]x. Adjusting for [growth differential/superior margins/balance sheet], the stock should trade at [Z]x, implying a fair value of [TARGET]. Our base case assumes [assumption 1] and [assumption 2].`,

  financial: `REVENUE ANALYSIS
[Ticker] generated $[X]B in revenue in the last fiscal year, representing [Y]% YoY growth. Revenue growth is driven by [primary driver — e.g., price increases, volume growth, new product lines]. We forecast revenue growth of [X]%, [Y]%, and [Z]% over the next three fiscal years, supported by [evidence].

MARGIN PROFILE
Gross margin stands at [X]% versus the peer group average of [Y]%, reflecting [explanation — e.g., premium pricing power, software mix shift]. EBITDA margin of [Z]% is [expanding/contracting] due to [reason]. We model 100-200bps of annual margin expansion as [operating leverage driver] flows through.

FREE CASH FLOW
The company converts [X]% of net income to free cash flow, generating $[Y] per share in FCF. This FCF yield of [Z]% at current prices is attractive relative to the [sector] average of [W]%. Capital allocation priorities are: [1st priority], [2nd priority], and [3rd priority].

BALANCE SHEET
[Ticker] maintains a [strong/overleveraged] balance sheet with $[X]B in cash and $[Y]B in debt, implying net leverage of [Z]x EBITDA. [Positive/negative] for [reason — e.g., provides acquisition firepower / limits financial flexibility]. Interest coverage ratio of [X]x provides adequate cushion.

KEY METRICS VS. PEERS
ROE: [X]% vs. peer avg [Y]% | ROIC: [X]% vs. peer avg [Y]% | Revenue growth: [X]% vs. [Y]% | P/E: [X]x vs. [Y]x | EV/EBITDA: [X]x vs. [Y]x. The premium/discount is justified because [reason].`,

  valuation: `DCF VALUATION
Using a DCF analysis with a WACC of [X]% and terminal growth rate of [Y]%, we derive an intrinsic value of $[Z] per share. Key assumptions: (1) Revenue CAGR of [X]% over the 5-year explicit period, (2) EBITDA margin expanding from [Y]% to [Z]%, (3) Capex as % of revenue declining from [A]% to [B]% as the business matures.

COMPARABLE COMPANY ANALYSIS
Trading at [X]x NTM EV/EBITDA and [Y]x NTM P/E, [Ticker] trades at a [discount/premium] to the peer group. The [X] closest peers — [Peer 1], [Peer 2], [Peer 3] — trade at average multiples of [Y]x EV/EBITDA and [Z]x P/E. Applying a target multiple of [A]x EV/EBITDA (justified by [superior growth/margins/quality]) implies a fair value of $[B].

HISTORICAL CONTEXT
[Ticker] has historically traded in a [X]x-[Y]x EV/EBITDA range over the past 5 years, with current multiples [above/below/at] the 5-year average of [Z]x. The [compression/expansion] is attributable to [reason]. We believe [re-rating thesis].

PRICE TARGET AND MARGIN OF SAFETY
Our 12-month price target of $[TARGET] is based on a blended valuation: [X]% weight to DCF ($[Y]), [X]% weight to comparables ($[Z]). At the current price of $[ENTRY], this represents [X]% upside with a margin of safety of [Y]% relative to our bear case of $[W]. Stop loss at $[STOP] limits downside to [Z]%.`,
};

const HINTS: Record<Action, Record<string, string>> = {
  improve: {
    executiveSummary: 'Add more specificity: include your price target, hold period, and conviction score early. Replace vague language ("significant opportunity") with numbers. Lead with the punchline — the committee should know your recommendation by sentence two.',
    thesis: 'Strengthen each claim with evidence. For every assertion, add a data point, metric, or reference. Structure the argument as: Claim → Evidence → Implication. Eliminate sections that do not directly support your BUY/SELL recommendation.',
    financial: 'Compare each metric against peers and historical averages, not just in isolation. Add the directionality: is the metric improving, deteriorating, or stable? Quantify the magnitude of change.',
    valuation: 'Make your assumptions explicit and defensible. State your WACC and justify it. Show the sensitivity to key variables. Explain why your target multiple is appropriate versus the current multiple.',
    _default: 'Strengthen the analysis by adding specific data points, quantifying your claims, and directly linking each point back to your investment thesis.',
  },
  concise: {
    executiveSummary: 'Cut to under 200 words. Remove all hedging language and filler phrases. Keep: recommendation, price target, 2 key drivers, biggest risk. Remove: background context that is obvious, repetitive points.',
    thesis: 'Remove sections that do not directly support your valuation argument. Consolidate business overview into 2-3 sentences. Each paragraph should add new information, not restate the previous one.',
    financial: 'Use a table format for comparisons. Replace narrative descriptions with data. Keep only the 4-5 metrics most critical to your thesis. Cut anything the committee can look up in 10 seconds.',
    valuation: 'State assumptions and conclusion in one compact paragraph each. Summarize comps in a single sentence with 2-3 data points. Focus on the punchline: why is the current price wrong?',
    _default: 'Remove filler phrases, condense repeated ideas, and cut any point that does not directly strengthen the investment case.',
  },
  expand: {
    executiveSummary: 'Add: (1) A brief business description for context, (2) Historical context for the opportunity, (3) A timeline for catalyst realization, (4) How this idea fits portfolio construction.',
    thesis: 'Deepen each section: add management quality assessment, industry structure analysis, competitive dynamics, regulatory environment, and an explicit bear case with your rebuttal.',
    financial: 'Add: segment-level analysis, bridge from historical to projected margins, working capital dynamics, return on invested capital trend, and analyst consensus vs. your estimates with explanation of divergence.',
    valuation: 'Add: bear/base/bull case scenarios with explicit assumptions for each, sensitivity table for WACC and growth rate, sum-of-the-parts breakdown if applicable, and precedent transactions if relevant.',
    _default: 'Add depth by including: data supporting each claim, peer comparisons, historical context, scenario analysis, and explicit assumptions behind your key forecasts.',
  },
  tone: {
    _default: 'Use the active voice and declarative sentences. Replace hedging language ("may," "could," "might") with conviction ("will," "should," "we expect"). Start with your conclusion and support it. Use professional investment terminology: initiate, maintain, reiterate (not "think" or "feel"). Number your key claims.',
  },
  grammar: {
    _default: 'Review for: (1) Subject-verb agreement on data-heavy sentences, (2) Consistent tense (present tense for current conditions, future tense for forecasts), (3) Proper use of commas in lists, (4) Numbers: spell out below 10, use numerals above, always use $ and % symbols. (5) Avoid starting sentences with "And" or "But".',
  },
  draft: {
    _default: '',
  },
};

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { action?: string; section?: string; content?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const action = (body.action ?? '') as Action;
  const section = body.section ?? '';

  const validActions: Action[] = ['draft', 'improve', 'concise', 'expand', 'tone', 'grammar'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'draft') {
    const result = DRAFTS[section] ?? null;
    return NextResponse.json({ result, hint: null });
  }

  const hintMap = HINTS[action] ?? {};
  const hint = hintMap[section] ?? hintMap['_default'] ?? null;
  return NextResponse.json({ result: null, hint });
}

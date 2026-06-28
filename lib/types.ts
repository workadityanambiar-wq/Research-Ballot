export type Role = 'CIO' | 'PM' | 'SR_ANALYST' | 'ANALYST';
export type Tier = 'A+' | 'A' | 'B';
export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REVIEW' | 'REJECTED';
export type Direction = 'LONG' | 'SHORT';

export type QuantLabel = 'Exceptional Technical Alignment' | 'Strong' | 'Good' | 'Neutral' | 'Weak';
export type TrendLabel = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
export type MomentumLabel = 'Very Strong' | 'Strong' | 'Neutral' | 'Weak' | 'Very Weak';
export type VolatilityLabel = 'Low' | 'Normal' | 'High' | 'Extreme';
export type TrendQualityLabel = 'Trending' | 'Weak Trend' | 'Sideways';

export interface IdeaQuantScore {
  id: string;
  ideaId: string;
  direction: string;
  // Raw indicators
  ema20: number; ema50: number; ema100: number; ema200: number;
  rsi14: number;
  macdLine: number; macdSignal: number; macdHist: number;
  atr14: number; atrPct: number; histVol: number;
  adx14: number; diPlus: number; diMinus: number;
  high52w: number; low52w: number;
  nearestSupport: number | null; nearestResistance: number | null;
  distToSupport: number | null; distToResistance: number | null;
  avgVolume20: number | null; relVolume: number | null;
  currentRange: number; avgRange: number;
  // MA flags
  priceAboveEma20: boolean; priceAboveEma50: boolean;
  priceAboveEma100: boolean; priceAboveEma200: boolean;
  ema20AboveEma50: boolean; ema50AboveEma100: boolean; ema100AboveEma200: boolean;
  // Component scores (0-10)
  trendScore: number; momentumScore: number; volatilityScore: number;
  trendQualityScore: number; maAlignmentScore: number;
  srScore: number; breakoutScore: number; volumeScore: number;
  // Labels
  trendLabel: TrendLabel; momentumLabel: MomentumLabel;
  volatilityLabel: VolatilityLabel; trendQualityLabel: TrendQualityLabel;
  quantLabel: QuantLabel;
  // Final
  finalQuantScore: number;
  calculatedAt: string;
  timeframe: string;
  createdAt: string; updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role;
  tier: Tier;
  hitRate: number;
  avgRet: number;
  sharpe: number;
  drawCtrl: number;
  consistency: number;
  peerScore: number;
  ideaScore: number;
  allocScore: number;
  researchScore: number;
}

export interface IdeaMarketSnapshot {
  id: string;
  ideaId: string;
  analystId: string;
  analystRole: string;
  // Immutable MT5 data at submission
  symbol: string;
  cmp: number;
  bid: number;
  ask: number;
  spread: number;
  mt5ServerTime: string;
  marketStatus: string;
  exchange: string;
  timeZone: string;
  // Idea snapshot
  direction: string;
  targetPrice: number;
  stopPrice: number;
  timeHorizon: string;
  weekId: string;
  weekNumber: number;
  votingCycle: string;
  // Submission metadata
  submittedAtUtc: string;
  tradingDay: string;
  marketSession: string;
  submissionIp: string | null;
  submissionDevice: string | null;
  submissionBrowser: string | null;
  // Live performance (updated periodically)
  currentPrice: number | null;
  currentPnlPct: number | null;
  currentPnlAbs: number | null;
  distanceToTarget: number | null;
  distanceToStop: number | null;
  mfe: number | null;
  mae: number | null;
  tradeStatus: 'OPEN' | 'TARGET_HIT' | 'STOP_HIT' | 'EXPIRED' | 'CLOSED';
  lastPriceUpdate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Mt5Quote {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  server_time: string;
  market_status: string;
  market_session: string;
  exchange: string;
  time_zone: string;
  digits: number;
  trading_day: string;
  week_number: number;
  description: string;
}

export interface Mt5QuantData {
  symbol: string; direction: string; price: number; calculated_at: string;
  ema20: number; ema50: number; ema100: number; ema200: number;
  rsi14: number; macd_line: number; macd_signal: number; macd_hist: number;
  atr14: number; atr_pct: number; hist_vol: number;
  adx14: number; di_plus: number; di_minus: number;
  high52w: number; low52w: number;
  nearest_support: number | null; nearest_resistance: number | null;
  dist_to_support: number | null; dist_to_resistance: number | null;
  avg_volume20: number | null; rel_volume: number | null;
  current_range: number; avg_range: number;
  price_above_ema20: boolean; price_above_ema50: boolean;
  price_above_ema100: boolean; price_above_ema200: boolean;
  ema20_above_ema50: boolean; ema50_above_ema100: boolean; ema100_above_ema200: boolean;
  trend_score: number; momentum_score: number; volatility_score: number;
  trend_quality_score: number; ma_alignment_score: number;
  sr_score: number; breakout_score: number; volume_score: number;
  trend_label: string; momentum_label: string; volatility_label: string;
  trend_quality_label: string; quant_label: string;
  quant_score: number;
}

export interface Idea {
  id: string;
  ticker: string;
  assetClass: string;
  dir: Direction;
  entry: number;
  stop: number;
  target: number;
  hold: string;
  posSize: number;
  conv: number;
  expRet: number;
  expDD: number;
  rr: number;
  thesis: string;
  catalysts: string[];
  risks: string[];
  authorId: string;
  submittedAt: string;
  weekId: string;
  status: string;
  totalCredits: number;
  rank: number;
  pmScore: number;
  skillScore: number;
  rrScore: number;
  quantScore: number;
  finalScore: number;
  momentumScore: number;
  rsScore: number;
  earningRevScore: number;
  approvalStatus: ApprovalStatus;
  imageUrl?: string;
  marketSnapshot?: IdeaMarketSnapshot;
  quantScoreData?: IdeaQuantScore;
}

export type VoteMap = Record<string, Record<string, number>>;

export interface PortfolioPosition {
  rank: number;
  ideaId: string;
  ticker: string;
  dir: Direction;
  alloc: number;
  expRet: number;
  sector: string;
  beta: number;
  pmOvr: boolean;
}

export interface AuditEntry {
  id: string;
  ts: string;
  userId: string;
  action: string;
  detail: string;
  ip: string;
  dev: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Session {
  userId: string;
  name: string;
  role: string;
  ip: string;
  dev: string;
  lastAct: string;
  status: 'ACTIVE' | 'IDLE' | 'BLOCKED' | 'TERMINATED';
  mfa: boolean;
  risk: number;
}

export interface GamingFlag {
  id: string;
  type: string;
  sev: 'HIGH' | 'MEDIUM' | 'LOW';
  users: string[];
  detail: string;
  score: number;
  ts: string;
}

export interface TickerItem {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
}

export type Phase = 'round1' | 'round1_closed' | 'round2' | 'results';

export type ResearchStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETE' | 'RISK_REVIEW' | 'COMMITTEE_REVIEW' | 'ARCHIVED';

export interface ResearchDoc {
  id: string;
  ideaId: string;
  status: ResearchStatus;
  templateType: string | null;
  thesis: string | null;
  financials: string | null;
  valuation: string | null;
  technical: string | null;
  overview: string | null;
  completionScore: number;
  qualityScore: number;
  authorId: string;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchCatalyst {
  id: string;
  docId: string;
  title: string;
  description: string;
  expectedImpact: string | null;
  probability: number | null;
  timeline: string | null;
  importance: string;
  sortOrder: number;
  createdAt: string;
}

export interface ResearchRisk {
  id: string;
  docId: string;
  description: string;
  severity: string;
  probability: number | null;
  mitigation: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ResearchAttachment {
  id: string;
  docId: string;
  title: string;
  description: string | null;
  fileType: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string;
  createdAt: string;
}

export interface ResearchReference {
  id: string;
  docId: string;
  title: string;
  source: string;
  url: string | null;
  publishDate: string | null;
  notes: string | null;
  addedBy: string;
  createdAt: string;
}

export interface ResearchComment {
  id: string;
  docId: string;
  parentId: string | null;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: ResearchComment[];
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  notes: string | null;
  addedBy: string;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  color: string | null;
  createdAt: string;
  items: WatchlistItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  date: string;
  ticker: string | null;
  ideaId: string | null;
  description: string | null;
  importance: string;
  createdBy: string;
  createdAt: string;
}

export interface EcoEvent {
  id: string;
  title: string;
  date: string;        // ISO UTC
  currency: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

export interface PostMortem {
  id: string;
  ideaId: string;
  authorId: string;
  entryDate: string | null;
  exitDate: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  actualReturn: number | null;
  maxDrawdown: number | null;
  holdDays: number | null;
  originalThesis: string | null;
  whatWorked: string | null;
  whatFailed: string | null;
  mistakes: string | null;
  lessonsLearned: string | null;
  futureAction: string | null;
  committeeNotes: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: string;
  userId: string;
  ideaId: string;
  amount: number;
  round: 1 | 2;
  submittedAt: string;
  weekId: string;
}

// ── Phase 4 — Portfolio & Trade Management ──

export type TradeStatus = 'PROPOSAL' | 'APPROVED' | 'ACTIVE' | 'PARTIAL_EXIT' | 'CLOSED' | 'CANCELLED';
export type ExecutionType = 'ENTRY' | 'ADD' | 'PARTIAL_EXIT' | 'FULL_EXIT' | 'STOP_LOSS' | 'STOP_ADJUSTED' | 'TARGET_ADJUSTED' | 'NOTE';
export type AlertType = 'STOP_LOSS_HIT' | 'TARGET_HIT' | 'EARNINGS_DATE' | 'HIGH_DRAWDOWN' | 'POSITION_AGE' | 'CONCENTRATION' | 'MARGIN_THRESHOLD' | 'MANUAL_REVIEW';

export interface Trade {
  id: string;
  ideaId: string;
  status: TradeStatus;
  side: string;
  exchange: string | null;
  currency: string;
  strategy: string | null;
  timeHorizon: string | null;
  convictionLevel: number | null;
  holdingPeriod: string | null;
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  riskReward: number | null;
  positionSize: number | null;
  maxCapital: number | null;
  maxExposurePct: number | null;
  tradeRationale: string | null;
  cioNotes: string | null;
  pmNotes: string | null;
  executionNotes: string | null;
  proposedBy: string;
  approvedBy: string | null;
  proposedAt: string;
  approvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  idea?: Partial<Idea>;
  position?: Position | null;
}

export interface TradeExecution {
  id: string;
  tradeId: string;
  type: ExecutionType;
  price: number;
  quantity: number;
  value: number;
  fees: number;
  executedBy: string;
  executedAt: string;
  notes: string | null;
  createdAt: string;
}

export interface Position {
  id: string;
  tradeId: string;
  ticker: string;
  direction: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number;
  returnPct: number | null;
  maxGain: number | null;
  maxDrawdown: number | null;
  daysHeld: number;
  stopLoss: number | null;
  target: number | null;
  entryDate: string;
  exitDate: string | null;
  lastPriceUpdate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PositionHistory {
  id: string;
  tradeId: string;
  eventType: string;
  description: string;
  price: number | null;
  quantity: number | null;
  value: number | null;
  createdBy: string;
  createdAt: string;
}

export interface TradeJournal {
  id: string;
  tradeId: string;
  field: string;
  content: string;
  authorId: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeAlert {
  id: string;
  tradeId: string | null;
  alertType: AlertType;
  message: string;
  severity: string;
  isRead: boolean;
  readAt: string | null;
  readBy: string | null;
  createdAt: string;
}

export interface PerformanceAttribution {
  id: string;
  tradeId: string;
  researchQuality: number | null;
  entryTiming: number | null;
  exitTiming: number | null;
  catalystOutcome: number | null;
  riskMgmt: number | null;
  positionSizing: number | null;
  executionQuality: number | null;
  analystComment: string | null;
  pmComment: string | null;
  cioComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalEquity: number;
  cashBalance: number;
  totalExposure: number;
  netExposure: number;
  grossExposure: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openPositions: number;
  closedPositions: number;
  longExposure: number;
  shortExposure: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
  profitFactor: number;
}
